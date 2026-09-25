-- KEMEX 0.52 — Data management: catalog, secure export/import, and backup registry.
-- All data-management functions are admin-only SECURITY DEFINER functions.

CREATE OR REPLACE FUNCTION public.kemex_data_catalog()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private, information_schema
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT private.has_role(ARRAY['admin']) THEN
    RAISE EXCEPTION 'غير مصرح بإدارة بيانات النظام.' USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(jsonb_agg(row_to_json(t)::jsonb ORDER BY t.table_name), '[]'::jsonb)
  INTO result
  FROM (
    SELECT
      tb.table_name,
      CASE
        WHEN tb.table_name IN (
          'audit_log','approval_events','backup_registry','release_registry',
          'client_error_events','user_notifications','notification_outbox',
          'attachments','attachment_metadata','profiles',
          'purchase_orders','invoice_documents'
        ) THEN false
        ELSE true
      END AS importable,
      CASE
        WHEN tb.table_name IN ('purchase_orders','invoice_documents') THEN 'projection'
        WHEN tb.table_name IN (
          'audit_log','approval_events','backup_registry','release_registry',
          'client_error_events','user_notifications','notification_outbox',
          'attachments','attachment_metadata','profiles'
        ) THEN 'system'
        ELSE 'business'
      END AS data_class,
      COALESCE((
        SELECT jsonb_agg(
          jsonb_build_object(
            'name', c.column_name,
            'type', c.data_type,
            'udt_name', c.udt_name,
            'nullable', c.is_nullable = 'YES',
            'default', c.column_default,
            'ordinal', c.ordinal_position,
            'primary_key', EXISTS (
              SELECT 1
              FROM pg_constraint pc
              JOIN LATERAL unnest(pc.conkey) WITH ORDINALITY AS keycols(attnum, ord) ON true
              JOIN pg_attribute pa
                ON pa.attrelid = pc.conrelid
               AND pa.attnum = keycols.attnum
              WHERE pc.contype = 'p'
                AND pc.conrelid = format('%I.%I', 'public', tb.table_name)::regclass
                AND pa.attname = c.column_name
            )
          ) ORDER BY c.ordinal_position
        )
        FROM information_schema.columns c
        WHERE c.table_schema = 'public'
          AND c.table_name = tb.table_name
          AND c.is_generated = 'NEVER'
          AND c.is_identity = 'NO'
      ), '[]'::jsonb) AS columns,
      COALESCE((
        SELECT jsonb_agg(pa.attname ORDER BY keycols.ord)
        FROM pg_constraint pc
        JOIN LATERAL unnest(pc.conkey) WITH ORDINALITY AS keycols(attnum, ord) ON true
        JOIN pg_attribute pa
          ON pa.attrelid = pc.conrelid
         AND pa.attnum = keycols.attnum
        WHERE pc.contype = 'p'
          AND pc.conrelid = format('%I.%I', 'public', tb.table_name)::regclass
      ), '[]'::jsonb) AS primary_key
    FROM information_schema.tables tb
    WHERE tb.table_schema = 'public'
      AND tb.table_type = 'BASE TABLE'
  ) t;

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.kemex_export_table(
  p_table_name text,
  p_limit integer DEFAULT 500,
  p_offset integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private, information_schema
AS $$
DECLARE
  result jsonb;
  normalized_limit integer := LEAST(GREATEST(COALESCE(p_limit, 500), 1), 1000);
  normalized_offset integer := GREATEST(COALESCE(p_offset, 0), 0);
BEGIN
  IF NOT private.has_role(ARRAY['admin']) THEN
    RAISE EXCEPTION 'غير مصرح بتصدير بيانات النظام.' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = p_table_name
      AND table_type = 'BASE TABLE'
  ) THEN
    RAISE EXCEPTION 'الجدول المطلوب غير موجود.' USING ERRCODE = '22023';
  END IF;

  EXECUTE format(
    'SELECT COALESCE(jsonb_agg(to_jsonb(r)), ''[]''::jsonb)
       FROM (SELECT * FROM public.%I LIMIT %s OFFSET %s) r',
    p_table_name, normalized_limit, normalized_offset
  )
  INTO result;

  RETURN COALESCE(result, '[]'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION public.kemex_import_table(
  p_table_name text,
  p_rows jsonb,
  p_mode text DEFAULT 'upsert'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private, information_schema
AS $$
DECLARE
  row_value jsonb;
  row_keys text[];
  valid_columns text[];
  primary_keys text[];
  column_sql text;
  select_sql text;
  conflict_sql text;
  update_sql text;
  statement_sql text;
  processed_count integer := 0;
  skipped_count integer := 0;
  current_key text;
  key_value jsonb;
  max_rows integer := 500;
BEGIN
  IF NOT private.has_role(ARRAY['admin']) THEN
    RAISE EXCEPTION 'غير مصرح باستيراد بيانات النظام.' USING ERRCODE = '42501';
  END IF;

  IF p_mode NOT IN ('upsert', 'insert') THEN
    RAISE EXCEPTION 'نوع الاستيراد غير صالح.' USING ERRCODE = '22023';
  END IF;

  IF p_table_name IN (
    'audit_log','approval_events','backup_registry','release_registry',
    'client_error_events','user_notifications','notification_outbox',
    'attachments','attachment_metadata','profiles',
    'purchase_orders','invoice_documents'
  ) THEN
    RAISE EXCEPTION 'هذا الجدول محمي من الاستيراد المباشر؛ استخدم المسار التشغيلي المعتمد.' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = p_table_name
      AND table_type = 'BASE TABLE'
  ) THEN
    RAISE EXCEPTION 'الجدول المطلوب غير موجود.' USING ERRCODE = '22023';
  END IF;

  IF jsonb_typeof(p_rows) <> 'array' THEN
    RAISE EXCEPTION 'بيانات الاستيراد يجب أن تكون مصفوفة.' USING ERRCODE = '22023';
  END IF;

  IF jsonb_array_length(p_rows) > max_rows THEN
    RAISE EXCEPTION 'الدفعة تتجاوز الحد الأقصى وهو % سجلًا.', max_rows USING ERRCODE = '22023';
  END IF;

  SELECT COALESCE(array_agg(c.column_name ORDER BY c.ordinal_position), ARRAY[]::text[])
  INTO valid_columns
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name = p_table_name
    AND c.is_generated = 'NEVER'
    AND c.is_identity = 'NO';

  SELECT COALESCE(array_agg(pa.attname ORDER BY keycols.ord), ARRAY[]::text[])
  INTO primary_keys
  FROM pg_constraint pc
  JOIN LATERAL unnest(pc.conkey) WITH ORDINALITY AS keycols(attnum, ord) ON true
  JOIN pg_attribute pa
    ON pa.attrelid = pc.conrelid
   AND pa.attnum = keycols.attnum
  WHERE pc.contype = 'p'
    AND pc.conrelid = format('%I.%I', 'public', p_table_name)::regclass;

  IF cardinality(primary_keys) = 0 THEN
    RAISE EXCEPTION 'الجدول % لا يملك مفتاحًا أساسيًا يمكن استخدامه للاستيراد.', p_table_name USING ERRCODE = '22023';
  END IF;

  FOR row_value IN SELECT value FROM jsonb_array_elements(p_rows)
  LOOP
    IF jsonb_typeof(row_value) <> 'object' THEN
      skipped_count := skipped_count + 1;
      CONTINUE;
    END IF;

    SELECT COALESCE(array_agg(k ORDER BY array_position(valid_columns, k)), ARRAY[]::text[])
    INTO row_keys
    FROM jsonb_object_keys(row_value) AS keys(k)
    WHERE k = ANY(valid_columns);

    IF cardinality(row_keys) = 0 THEN
      skipped_count := skipped_count + 1;
      CONTINUE;
    END IF;

    IF p_mode = 'upsert' THEN
      FOREACH current_key IN ARRAY primary_keys
      LOOP
        IF NOT (current_key = ANY(row_keys)) THEN
          RAISE EXCEPTION 'السجل في جدول % يفتقد المفتاح الأساسي %.', p_table_name, current_key USING ERRCODE = '22023';
        END IF;
        key_value := row_value -> current_key;
        IF key_value IS NULL OR jsonb_typeof(key_value) = 'null' OR btrim(key_value #>> '{}') = '' THEN
          RAISE EXCEPTION 'المفتاح الأساسي % في جدول % لا يمكن أن يكون فارغًا.', current_key, p_table_name USING ERRCODE = '22023';
        END IF;
      END LOOP;
    END IF;

    SELECT string_agg(format('%I', k), ', ' ORDER BY array_position(row_keys, k))
    INTO column_sql
    FROM unnest(row_keys) AS selected(k);

    SELECT string_agg(format('r.%I', k), ', ' ORDER BY array_position(row_keys, k))
    INTO select_sql
    FROM unnest(row_keys) AS selected(k);

    IF p_mode = 'upsert' THEN
      SELECT string_agg(format('%I', pk), ', ' ORDER BY array_position(primary_keys, pk))
      INTO conflict_sql
      FROM unnest(primary_keys) AS key_names(pk);

      SELECT string_agg(format('%I = EXCLUDED.%I', k, k), ', ' ORDER BY array_position(row_keys, k))
      INTO update_sql
      FROM unnest(row_keys) AS update_keys(k)
      WHERE NOT (k = ANY(primary_keys));

      statement_sql := format(
        'INSERT INTO public.%I (%s)
         SELECT %s FROM jsonb_populate_record(NULL::public.%I, %L::jsonb) r',
        p_table_name, column_sql, select_sql, p_table_name, row_value::text
      );

      IF update_sql IS NULL OR btrim(update_sql) = '' THEN
        statement_sql := statement_sql || format(' ON CONFLICT (%s) DO NOTHING', conflict_sql);
      ELSE
        statement_sql := statement_sql || format(' ON CONFLICT (%s) DO UPDATE SET %s', conflict_sql, update_sql);
      END IF;
    ELSE
      statement_sql := format(
        'INSERT INTO public.%I (%s)
         SELECT %s FROM jsonb_populate_record(NULL::public.%I, %L::jsonb)',
        p_table_name, column_sql, select_sql, p_table_name, row_value::text
      );
    END IF;

    EXECUTE statement_sql;
    processed_count := processed_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'table_name', p_table_name,
    'mode', p_mode,
    'processed', processed_count,
    'skipped', skipped_count
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.kemex_register_backup(
  p_backup_kind text,
  p_provider_reference text DEFAULT NULL,
  p_status text DEFAULT 'captured',
  p_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  new_id uuid;
BEGIN
  IF NOT private.has_role(ARRAY['admin']) THEN
    RAISE EXCEPTION 'غير مصرح بتسجيل النسخ الاحتياطية.' USING ERRCODE = '42501';
  END IF;

  IF p_backup_kind NOT IN ('scheduled','pre_release','manual','restore_point') THEN
    RAISE EXCEPTION 'نوع النسخة الاحتياطية غير صالح.' USING ERRCODE = '22023';
  END IF;

  IF p_status NOT IN ('captured','verified','failed','restored') THEN
    RAISE EXCEPTION 'حالة النسخة الاحتياطية غير صالحة.' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.backup_registry(environment, backup_kind, provider_reference, status, notes, verified_at, verified_by)
  VALUES ('production', p_backup_kind, p_provider_reference, p_status, p_notes,
          CASE WHEN p_status IN ('verified','restored') THEN now() ELSE NULL END,
          CASE WHEN p_status IN ('verified','restored') THEN auth.uid() ELSE NULL END)
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

REVOKE ALL ON FUNCTION public.kemex_data_catalog() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.kemex_export_table(text, integer, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.kemex_import_table(text, jsonb, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.kemex_register_backup(text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.kemex_data_catalog() TO authenticated;
GRANT EXECUTE ON FUNCTION public.kemex_export_table(text, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.kemex_import_table(text, jsonb, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.kemex_register_backup(text, text, text, text) TO authenticated;

COMMENT ON FUNCTION public.kemex_data_catalog() IS 'Admin-only catalog of all public base tables and their import/export metadata.';
COMMENT ON FUNCTION public.kemex_export_table(text, integer, integer) IS 'Admin-only paged logical export of a public base table; RLS is bypassed inside the secured function.';
COMMENT ON FUNCTION public.kemex_import_table(text, jsonb, text) IS 'Admin-only batched upsert/insert for supported public business tables.';
COMMENT ON FUNCTION public.kemex_register_backup(text, text, text, text) IS 'Admin-only backup/restore registry entry.';
