-- KEMEX 031: evolve centralized print presentation without breaking existing settings.
-- The JSONB column remains backward-compatible; this migration only adds missing keys
-- and replaces the bundled application logo with an empty company-logo slot when it
-- was never customized by the administrator.
UPDATE public.organization_settings
SET print_settings =
  COALESCE(print_settings, '{}'::jsonb)
  || jsonb_build_object(
    'applyGlobalTemplate', COALESCE((print_settings->>'applyGlobalTemplate')::boolean, true),
    'companyAddress', COALESCE(print_settings->>'companyAddress', ''),
    'companyContact', COALESCE(print_settings->>'companyContact', ''),
    'logoWidthMm', COALESCE(NULLIF(print_settings->>'logoWidthMm', '')::numeric, 32),
    'showCompanyDetails', COALESCE((print_settings->>'showCompanyDetails')::boolean, false),
    'showDocumentMeta', COALESCE((print_settings->>'showDocumentMeta')::boolean, true),
    'showHeaderRule', COALESCE((print_settings->>'showHeaderRule')::boolean, true),
    'layoutStyle', COALESCE(print_settings->>'layoutStyle', 'corporate'),
    'fontFamily', COALESCE(print_settings->>'fontFamily', 'alexandria'),
    'signatureHeightMm', COALESCE(NULLIF(print_settings->>'signatureHeightMm', '')::numeric, 19),
    'logoSrc', CASE
      WHEN COALESCE(print_settings->>'logoSrc', '') = '/kemex.svg' THEN ''
      ELSE COALESCE(print_settings->>'logoSrc', '')
    END
  )
WHERE id = true;

COMMENT ON COLUMN public.organization_settings.print_settings IS
  'Central administrator-controlled print presentation defaults for KEMEX reports and business documents, including company branding, optional global application, layout, paper and signature rules.';
