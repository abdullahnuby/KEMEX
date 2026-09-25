-- KEMEX 032: make centralized print settings deployment-safe.
-- This is idempotent and remains safe when 030/031 were already applied.
ALTER TABLE public.organization_settings
  ADD COLUMN IF NOT EXISTS print_settings jsonb NOT NULL DEFAULT '{}'::jsonb;

UPDATE public.organization_settings
SET print_settings =
  jsonb_build_object(
    'applyGlobalTemplate', COALESCE((print_settings->>'applyGlobalTemplate')::boolean, true),
    'companyAddress', COALESCE(print_settings->>'companyAddress', ''),
    'companyContact', COALESCE(print_settings->>'companyContact', ''),
    'showLogo', COALESCE((print_settings->>'showLogo')::boolean, true),
    'logoSrc', COALESCE(print_settings->>'logoSrc', ''),
    'logoWidthMm', COALESCE(NULLIF(print_settings->>'logoWidthMm', '')::numeric, 32),
    'showCompanyName', COALESCE((print_settings->>'showCompanyName')::boolean, true),
    'showGroupName', COALESCE((print_settings->>'showGroupName')::boolean, false),
    'showCompanyDetails', COALESCE((print_settings->>'showCompanyDetails')::boolean, false),
    'showDocumentLabel', COALESCE((print_settings->>'showDocumentLabel')::boolean, false),
    'showDocumentMeta', COALESCE((print_settings->>'showDocumentMeta')::boolean, true),
    'showHeaderRule', COALESCE((print_settings->>'showHeaderRule')::boolean, true),
    'showFooter', COALESCE((print_settings->>'showFooter')::boolean, true),
    'showPageNumbers', COALESCE((print_settings->>'showPageNumbers')::boolean, true),
    'showAppName', COALESCE((print_settings->>'showAppName')::boolean, false),
    'appName', COALESCE(NULLIF(print_settings->>'appName', ''), 'KEMEX'),
    'footerText', COALESCE(print_settings->>'footerText', ''),
    'primaryColor', CASE WHEN COALESCE(print_settings->>'primaryColor', '') ~ '^#[0-9A-Fa-f]{6}$' THEN print_settings->>'primaryColor' ELSE '#0b7285' END,
    'layoutStyle', CASE WHEN print_settings->>'layoutStyle' IN ('corporate','minimal','clean') THEN print_settings->>'layoutStyle' ELSE 'corporate' END,
    'fontFamily', CASE WHEN print_settings->>'fontFamily' IN ('alexandria','tajawal','system') THEN print_settings->>'fontFamily' ELSE 'alexandria' END,
    'paperSize', CASE WHEN print_settings->>'paperSize' IN ('A4','Letter') THEN print_settings->>'paperSize' ELSE 'A4' END,
    'orientation', CASE WHEN print_settings->>'orientation' IN ('auto','portrait','landscape') THEN print_settings->>'orientation' ELSE 'auto' END,
    'marginTopMm', COALESCE(NULLIF(print_settings->>'marginTopMm', '')::numeric, 10),
    'marginRightMm', COALESCE(NULLIF(print_settings->>'marginRightMm', '')::numeric, 12),
    'marginBottomMm', COALESCE(NULLIF(print_settings->>'marginBottomMm', '')::numeric, 44),
    'marginLeftMm', COALESCE(NULLIF(print_settings->>'marginLeftMm', '')::numeric, 12),
    'tableDensity', CASE WHEN print_settings->>'tableDensity' IN ('compact','standard','comfortable') THEN print_settings->>'tableDensity' ELSE 'standard' END,
    'signatureMode', CASE WHEN print_settings->>'signatureMode' IN ('every-page','last-page','none') THEN print_settings->>'signatureMode' ELSE 'every-page' END,
    'signatureHeightMm', COALESCE(NULLIF(print_settings->>'signatureHeightMm', '')::numeric, 19),
    'signatureLabels', CASE WHEN jsonb_typeof(print_settings->'signatureLabels') = 'array' AND jsonb_array_length(print_settings->'signatureLabels') > 0 THEN print_settings->'signatureLabels' ELSE jsonb_build_array('إعداد','مراجعة','اعتماد') END
  )
WHERE id = true;

COMMENT ON COLUMN public.organization_settings.print_settings IS
  'Central administrator-controlled print presentation defaults. Safe to deploy even when earlier print migrations were skipped.';
