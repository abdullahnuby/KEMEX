-- KEMEX 0.52 — Enterprise data controls, normalized projections, notifications,
-- attachments metadata, observability and release/backup primitives.
-- This migration is deliberately additive: the existing UI contract remains valid
-- while purchases/invoices gain strongly typed database projections and guarded writes.

CREATE OR REPLACE FUNCTION private.safe_numeric(p_value text, p_default numeric DEFAULT 0)
RETURNS numeric
LANGUAGE plpgsql IMMUTABLE
AS $$
BEGIN
  IF p_value IS NULL OR btrim(p_value) = '' THEN RETURN p_default; END IF;
  IF p_value ~ '^-?[0-9]+([.][0-9]+)?$' THEN RETURN p_value::numeric; END IF;
  RETURN p_default;
END;
$$;

CREATE TABLE IF NOT EXISTS public.purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id text NOT NULL UNIQUE,
  request_number text,
  supplier text,
  description text,
  category text,
  quantity numeric NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  unit text,
  estimated_amount numeric NOT NULL DEFAULT 0 CHECK (estimated_amount >= 0),
  status text NOT NULL DEFAULT 'قيد الاعتماد' CHECK (status IN ('قيد الاعتماد','معتمد','مرفوض','أمر شراء')),
  receipt_status text NOT NULL DEFAULT 'لم يستلم' CHECK (receipt_status IN ('لم يستلم','مستلم جزئي','مستلم بالكامل')),
  project_id text,
  warehouse text,
  supplier_reference text,
  ordered_at date,
  received_at date,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS purchase_orders_status_idx ON public.purchase_orders(status, updated_at DESC);
CREATE INDEX IF NOT EXISTS purchase_orders_supplier_idx ON public.purchase_orders(supplier);

CREATE TABLE IF NOT EXISTS public.invoice_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id text NOT NULL UNIQUE,
  invoice_number text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('مورد','عميل')),
  party text NOT NULL,
  invoice_date date,
  due_date date,
  description text,
  account text,
  subtotal numeric NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  vat numeric NOT NULL DEFAULT 0 CHECK (vat >= 0),
  discount numeric NOT NULL DEFAULT 0 CHECK (discount >= 0),
  total numeric NOT NULL DEFAULT 0 CHECK (total >= 0),
  paid numeric NOT NULL DEFAULT 0 CHECK (paid >= 0),
  remaining numeric NOT NULL DEFAULT 0 CHECK (remaining >= 0),
  status text NOT NULL DEFAULT 'مسجلة' CHECK (status IN ('مسجلة','بانتظار مراجعة','معتمدة','مرحلة','مدفوعة','محصلة','مرفوضة')),
  linked_record text,
  payment_method text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE OR REPLACE FUNCTION private.sync_invoice_document_totals()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public, private
AS $$
BEGIN
  NEW.total := greatest(0, COALESCE(NEW.subtotal, 0) + COALESCE(NEW.vat, 0) - COALESCE(NEW.discount, 0));
  NEW.remaining := greatest(0, NEW.total - COALESCE(NEW.paid, 0));
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_invoice_document_totals ON public.invoice_documents;
CREATE TRIGGER trg_invoice_document_totals
BEFORE INSERT OR UPDATE OF subtotal, vat, discount, paid
ON public.invoice_documents
FOR EACH ROW EXECUTE FUNCTION private.sync_invoice_document_totals();
CREATE INDEX IF NOT EXISTS invoice_documents_status_idx ON public.invoice_documents(status, due_date);
CREATE INDEX IF NOT EXISTS invoice_documents_party_idx ON public.invoice_documents(party);

CREATE TABLE IF NOT EXISTS public.notification_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  link text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS notification_outbox_recipient_idx ON public.notification_outbox(recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS notification_outbox_unread_idx ON public.notification_outbox(recipient_id) WHERE read_at IS NULL;

CREATE TABLE IF NOT EXISTS public.attachment_metadata (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  file_name text NOT NULL,
  storage_path text NOT NULL UNIQUE,
  content_type text,
  byte_size bigint CHECK (byte_size IS NULL OR byte_size >= 0),
  checksum text,
  uploaded_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE INDEX IF NOT EXISTS attachment_entity_idx ON public.attachment_metadata(entity_type, entity_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.client_error_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES public.profiles(id),
  route text,
  error_name text,
  message text NOT NULL,
  stack text,
  component_stack text,
  user_agent text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS client_error_events_time_idx ON public.client_error_events(created_at DESC);

CREATE TABLE IF NOT EXISTS public.release_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version text NOT NULL,
  environment text NOT NULL CHECK (environment IN ('development','staging','production')),
  git_sha text,
  migration_version text,
  deployed_at timestamptz NOT NULL DEFAULT now(),
  deployed_by uuid REFERENCES public.profiles(id),
  rollback_version text,
  notes text
);
CREATE UNIQUE INDEX IF NOT EXISTS release_registry_env_version_idx ON public.release_registry(environment, version);

CREATE TABLE IF NOT EXISTS public.backup_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  environment text NOT NULL CHECK (environment IN ('staging','production')),
  backup_kind text NOT NULL CHECK (backup_kind IN ('scheduled','pre_release','manual','restore_point')),
  provider_reference text,
  captured_at timestamptz NOT NULL DEFAULT now(),
  verified_at timestamptz,
  verified_by uuid REFERENCES public.profiles(id),
  status text NOT NULL DEFAULT 'captured' CHECK (status IN ('captured','verified','failed','restored')),
  notes text
);
CREATE INDEX IF NOT EXISTS backup_registry_time_idx ON public.backup_registry(environment, captured_at DESC);

-- One canonical action matrix. UI helpers mirror this; the DB remains authoritative.
CREATE OR REPLACE FUNCTION private.can_action(p_module text, p_action text)
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE r text := private.current_role();
BEGIN
  IF r IS NULL THEN RETURN false; END IF;
  IF r = 'admin' THEN RETURN true; END IF;
  RETURN CASE p_module || ':' || p_action
    WHEN 'users:manage' THEN false
    WHEN 'audit:read' THEN r IN ('mgmt','fleet','maint','acct')
    WHEN 'maintenance:transition' THEN r IN ('maint','fleet')
    WHEN 'trips:transition' THEN r IN ('fleet','pm','acct')
    WHEN 'purchases:approve' THEN r IN ('fleet','maint')
    WHEN 'purchases:receive' THEN r IN ('fleet','maint','acct')
    WHEN 'invoices:approve' THEN r = 'acct'
    WHEN 'invoices:pay' THEN r = 'acct'
    WHEN 'attachments:write' THEN r IN ('fleet','pm','eng','maint','acct')
    WHEN 'observability:write' THEN true
    ELSE private.can_module(p_module, 'write')
  END;
END;
$$;
REVOKE EXECUTE ON FUNCTION private.can_action(text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.can_action(text,text) TO authenticated;

-- Strongly typed projections are fed by the existing generic UI records. This allows
-- a zero-downtime migration away from JSONB/EAV without breaking the current release.
CREATE OR REPLACE FUNCTION private.sync_enterprise_record_projection()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE p jsonb;
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.module_name = 'purchases' THEN DELETE FROM public.purchase_orders WHERE record_id = OLD.record_id; END IF;
    IF OLD.module_name = 'invoices' THEN DELETE FROM public.invoice_documents WHERE record_id = OLD.record_id; END IF;
    RETURN OLD;
  END IF;
  p := NEW.payload;
  IF NEW.module_name = 'purchases' THEN
    IF TG_OP = 'UPDATE' AND NEW.payload->>'status' IS DISTINCT FROM OLD.payload->>'status' THEN
      IF NOT private.can_action('purchases','approve') AND NEW.payload->>'status' IN ('معتمد','مرفوض','أمر شراء') THEN
        RAISE EXCEPTION 'غير مصرح بتغيير حالة طلب الشراء إلى %', NEW.payload->>'status' USING ERRCODE = '42501';
      END IF;
    END IF;
    INSERT INTO public.purchase_orders(record_id,request_number,supplier,description,category,quantity,unit,estimated_amount,status,receipt_status,project_id,warehouse,supplier_reference,ordered_at,payload,updated_at)
    VALUES (
      NEW.record_id, p->>'number', p->>'supplier', p->>'desc', p->>'category', private.safe_numeric(p->>'qty'), p->>'unit',
      private.safe_numeric(p->>'est'), COALESCE(NULLIF(p->>'status',''),'قيد الاعتماد'), COALESCE(NULLIF(p->>'receiptStatus',''),'لم يستلم'),
      p->>'proj', p->>'warehouse', p->>'quotationRef', CASE WHEN p->>'date' ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN (p->>'date')::date END, p, NEW.updated_at
    )
    ON CONFLICT(record_id) DO UPDATE SET request_number=EXCLUDED.request_number,supplier=EXCLUDED.supplier,description=EXCLUDED.description,category=EXCLUDED.category,quantity=EXCLUDED.quantity,unit=EXCLUDED.unit,estimated_amount=EXCLUDED.estimated_amount,status=EXCLUDED.status,receipt_status=EXCLUDED.receipt_status,project_id=EXCLUDED.project_id,warehouse=EXCLUDED.warehouse,supplier_reference=EXCLUDED.supplier_reference,ordered_at=EXCLUDED.ordered_at,payload=EXCLUDED.payload,updated_at=EXCLUDED.updated_at;
  ELSIF NEW.module_name = 'invoices' THEN
    IF TG_OP = 'UPDATE' AND NEW.payload->>'status' IS DISTINCT FROM OLD.payload->>'status' THEN
      IF NEW.payload->>'status' IN ('مدفوعة','محصلة') AND NOT private.can_action('invoices','pay') THEN
        RAISE EXCEPTION 'غير مصرح بتسجيل سداد/تحصيل الفاتورة';
      END IF;
      IF NEW.payload->>'status' IN ('معتمدة','مرحلة') AND NOT private.can_action('invoices','approve') THEN
        RAISE EXCEPTION 'غير مصرح باعتماد/ترحيل الفاتورة';
      END IF;
    END IF;
    INSERT INTO public.invoice_documents(record_id,invoice_number,kind,party,invoice_date,due_date,description,account,subtotal,vat,discount,paid,status,linked_record,payment_method,payload,updated_at)
    VALUES (
      NEW.record_id, COALESCE(NULLIF(p->>'number',''),NEW.record_id), COALESCE(NULLIF(p->>'kind',''),'مورد'), COALESCE(p->>'party',''), CASE WHEN p->>'date' ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN (p->>'date')::date END, CASE WHEN p->>'dueDate' ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN (p->>'dueDate')::date END,
      p->>'description', p->>'account', private.safe_numeric(p->>'sub'), private.safe_numeric(p->>'vat'), private.safe_numeric(p->>'discount'), private.safe_numeric(p->>'paid'),
      COALESCE(NULLIF(p->>'status',''),'مسجلة'), p->>'link', p->>'paymentMethod', p, NEW.updated_at
    )
    ON CONFLICT(record_id) DO UPDATE SET invoice_number=EXCLUDED.invoice_number,kind=EXCLUDED.kind,party=EXCLUDED.party,invoice_date=EXCLUDED.invoice_date,due_date=EXCLUDED.due_date,description=EXCLUDED.description,account=EXCLUDED.account,subtotal=EXCLUDED.subtotal,vat=EXCLUDED.vat,discount=EXCLUDED.discount,paid=EXCLUDED.paid,status=EXCLUDED.status,linked_record=EXCLUDED.linked_record,payment_method=EXCLUDED.payment_method,payload=EXCLUDED.payload,updated_at=EXCLUDED.updated_at;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_enterprise_record_projection ON public.tfms_module_records;
CREATE TRIGGER trg_enterprise_record_projection
AFTER INSERT OR UPDATE OR DELETE ON public.tfms_module_records
FOR EACH ROW EXECUTE FUNCTION private.sync_enterprise_record_projection();

-- Backfill existing records into the typed projections.
INSERT INTO public.purchase_orders(record_id,request_number,supplier,description,category,quantity,unit,estimated_amount,status,receipt_status,project_id,warehouse,supplier_reference,ordered_at,payload)
SELECT record_id,payload->>'number',payload->>'supplier',payload->>'desc',payload->>'category',private.safe_numeric(payload->>'qty'),payload->>'unit',private.safe_numeric(payload->>'est'),COALESCE(NULLIF(payload->>'status',''),'قيد الاعتماد'),COALESCE(NULLIF(payload->>'receiptStatus',''),'لم يستلم'),payload->>'proj',payload->>'warehouse',payload->>'quotationRef',CASE WHEN payload->>'date' ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN (payload->>'date')::date END,payload
FROM public.tfms_module_records WHERE module_name='purchases'
ON CONFLICT(record_id) DO UPDATE SET payload=EXCLUDED.payload,updated_at=now();

INSERT INTO public.invoice_documents(record_id,invoice_number,kind,party,invoice_date,due_date,description,account,subtotal,vat,discount,paid,status,linked_record,payment_method,payload)
SELECT record_id,COALESCE(NULLIF(payload->>'number',''),record_id),COALESCE(NULLIF(payload->>'kind',''),'مورد'),COALESCE(payload->>'party',''),CASE WHEN payload->>'date' ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN (payload->>'date')::date END,CASE WHEN payload->>'dueDate' ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN (payload->>'dueDate')::date END,payload->>'description',payload->>'account',private.safe_numeric(payload->>'sub'),private.safe_numeric(payload->>'vat'),private.safe_numeric(payload->>'discount'),private.safe_numeric(payload->>'paid'),COALESCE(NULLIF(payload->>'status',''),'مسجلة'),payload->>'link',payload->>'paymentMethod',payload
FROM public.tfms_module_records WHERE module_name='invoices'
ON CONFLICT(record_id) DO UPDATE SET payload=EXCLUDED.payload,updated_at=now();

-- Security boundaries.
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attachment_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_error_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.release_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backup_registry ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS purchase_orders_read ON public.purchase_orders;
CREATE POLICY purchase_orders_read ON public.purchase_orders FOR SELECT TO authenticated USING (private.can_module('purchases','read'));
DROP POLICY IF EXISTS invoice_documents_read ON public.invoice_documents;
CREATE POLICY invoice_documents_read ON public.invoice_documents FOR SELECT TO authenticated USING (private.can_module('invoices','read'));
DROP POLICY IF EXISTS notification_outbox_read ON public.notification_outbox;
CREATE POLICY notification_outbox_read ON public.notification_outbox FOR SELECT TO authenticated USING (recipient_id = auth.uid()::uuid);
DROP POLICY IF EXISTS notification_outbox_update ON public.notification_outbox;
CREATE POLICY notification_outbox_update ON public.notification_outbox FOR UPDATE TO authenticated USING (recipient_id = auth.uid()::uuid) WITH CHECK (recipient_id = auth.uid()::uuid);
DROP POLICY IF EXISTS attachment_metadata_read ON public.attachment_metadata;
CREATE POLICY attachment_metadata_read ON public.attachment_metadata FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS attachment_metadata_write ON public.attachment_metadata;
CREATE POLICY attachment_metadata_write ON public.attachment_metadata FOR INSERT TO authenticated WITH CHECK (uploaded_by = auth.uid()::uuid AND private.can_action('attachments','write'));
DROP POLICY IF EXISTS attachment_metadata_delete ON public.attachment_metadata;
CREATE POLICY attachment_metadata_delete ON public.attachment_metadata FOR UPDATE TO authenticated USING (uploaded_by = auth.uid()::uuid OR private.has_role(array['admin'])) WITH CHECK (uploaded_by = auth.uid()::uuid OR private.has_role(array['admin']));
DROP POLICY IF EXISTS client_error_events_insert ON public.client_error_events;
CREATE POLICY client_error_events_insert ON public.client_error_events FOR INSERT TO authenticated WITH CHECK (actor_id = auth.uid()::uuid);
DROP POLICY IF EXISTS client_error_events_admin_read ON public.client_error_events;
CREATE POLICY client_error_events_admin_read ON public.client_error_events FOR SELECT TO authenticated USING (private.has_role(array['admin','mgmt']));
DROP POLICY IF EXISTS release_registry_admin_read ON public.release_registry;
CREATE POLICY release_registry_admin_read ON public.release_registry FOR SELECT TO authenticated USING (private.has_role(array['admin','mgmt']));
DROP POLICY IF EXISTS backup_registry_admin_read ON public.backup_registry;
CREATE POLICY backup_registry_admin_read ON public.backup_registry FOR SELECT TO authenticated USING (private.has_role(array['admin','mgmt']));

GRANT SELECT ON public.purchase_orders, public.invoice_documents, public.notification_outbox, public.attachment_metadata, public.client_error_events, public.release_registry, public.backup_registry TO authenticated;
GRANT UPDATE(read_at) ON public.notification_outbox TO authenticated;
GRANT INSERT ON public.attachment_metadata, public.client_error_events TO authenticated;

-- Notification primitive: callers can enqueue only for their own identity unless admin.
CREATE OR REPLACE FUNCTION public.enqueue_notification(p_recipient uuid,p_event_type text,p_title text,p_body text,p_link text DEFAULT NULL,p_payload jsonb DEFAULT '{}'::jsonb)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE v_id uuid;
BEGIN
  IF p_recipient <> auth.uid()::uuid AND NOT private.has_role(array['admin']) THEN
    RAISE EXCEPTION 'غير مصرح بإنشاء إشعار لمستخدم آخر' USING ERRCODE='42501';
  END IF;
  INSERT INTO public.notification_outbox(recipient_id,event_type,title,body,link,payload)
  VALUES(p_recipient,p_event_type,p_title,p_body,p_link,coalesce(p_payload,'{}'::jsonb)) RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.enqueue_notification(uuid,text,text,text,text,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.enqueue_notification(uuid,text,text,text,text,jsonb) TO authenticated;

COMMENT ON TABLE public.purchase_orders IS 'Typed procurement projection; JSONB remains compatibility source during migration.';
COMMENT ON TABLE public.invoice_documents IS 'Typed invoice projection with database-calculated totals.';
COMMENT ON TABLE public.notification_outbox IS 'Durable notification queue/inbox source.';
COMMENT ON TABLE public.attachment_metadata IS 'Attachment lifecycle metadata; binary content belongs in object storage.';
COMMENT ON TABLE public.client_error_events IS 'Production frontend error telemetry with actor and route context.';

-- Production object-storage contract for attachment binaries. Metadata remains in Postgres.
DO $$
BEGIN
  IF to_regclass('storage.buckets') IS NOT NULL THEN
    INSERT INTO storage.buckets(id,name,public) VALUES ('kemex-attachments','kemex-attachments',false)
    ON CONFLICT (id) DO UPDATE SET public=false;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.report_client_error(p_route text,p_error_name text,p_message text,p_stack text DEFAULT NULL,p_component_stack text DEFAULT NULL,p_metadata jsonb DEFAULT '{}'::jsonb)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE v_id uuid;
BEGIN
  INSERT INTO public.client_error_events(actor_id,route,error_name,message,stack,component_stack,user_agent,metadata)
  VALUES(auth.uid()::uuid,left(p_route,500),left(p_error_name,200),left(p_message,4000),left(p_stack,10000),left(p_component_stack,10000),null,coalesce(p_metadata,'{}'::jsonb))
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.report_client_error(text,text,text,text,text,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.report_client_error(text,text,text,text,text,jsonb) TO authenticated;
DO $$
BEGIN
  IF to_regclass('storage.objects') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS kemex_attachment_read ON storage.objects';
    EXECUTE 'CREATE POLICY kemex_attachment_read ON storage.objects FOR SELECT TO authenticated USING (bucket_id::text = ''kemex-attachments'' AND private.can_action(''attachments'',''write''))';
    EXECUTE 'DROP POLICY IF EXISTS kemex_attachment_insert ON storage.objects';
    EXECUTE 'CREATE POLICY kemex_attachment_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id::text = ''kemex-attachments'' AND private.can_action(''attachments'',''write''))';
    EXECUTE 'DROP POLICY IF EXISTS kemex_attachment_delete ON storage.objects';
    EXECUTE 'CREATE POLICY kemex_attachment_delete ON storage.objects FOR DELETE TO authenticated USING (bucket_id::text = ''kemex-attachments'' AND (owner_id = auth.uid()::uuid OR private.has_role(array[''admin''])) )';
  END IF;
END $$;

-- Approval-event -> durable notification fan-out. Delivery can later be consumed by
-- email/push workers without changing the business transaction.
CREATE OR REPLACE FUNCTION private.fanout_approval_notification()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE target_roles text[];
BEGIN
  target_roles := CASE NEW.module_name
    WHEN 'maintenance' THEN ARRAY['maint','fleet']
    WHEN 'trips' THEN ARRAY['fleet','pm','acct']
    WHEN 'purchases' THEN ARRAY['fleet','maint','acct']
    WHEN 'invoices' THEN ARRAY['acct','mgmt']
    ELSE ARRAY['admin','mgmt']
  END;
  INSERT INTO public.notification_outbox(recipient_id,event_type,title,body,link,payload)
  SELECT p.id,'workflow.' || COALESCE(NEW.module_name,'record'),
         'تغيير حالة في KEMEX',
         COALESCE(NEW.module_name,'سجل') || ' · ' || COALESCE(NEW.from_status,'جديد') || ' ← ' || COALESCE(NEW.to_status,''),
         CASE WHEN NEW.module_name='trips' THEN '#/trips/' || NEW.record_id ELSE NULL END,
         jsonb_build_object('approvalEventId',NEW.id,'module',NEW.module_name,'recordId',NEW.record_id,'toStatus',NEW.to_status)
  FROM public.profiles p
  WHERE p.active = true AND p.role = ANY(target_roles) AND p.id IS DISTINCT FROM COALESCE(NEW.acted_by, NULL::uuid);
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_approval_event_notification ON public.approval_events;
CREATE TRIGGER trg_approval_event_notification
AFTER INSERT ON public.approval_events
FOR EACH ROW EXECUTE FUNCTION private.fanout_approval_notification();
