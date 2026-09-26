-- KEMEX 029: centralized, administrator-configurable print presentation.
-- Kept as JSONB so the printing layout can evolve without repeated schema migrations.
ALTER TABLE public.organization_settings
  ADD COLUMN IF NOT EXISTS print_settings jsonb NOT NULL DEFAULT jsonb_build_object(
    'showLogo', true,
    'logoSrc', '/kemex.svg',
    'showCompanyName', true,
    'showGroupName', false,
    'showDocumentLabel', false,
    'showFooter', true,
    'showPageNumbers', true,
    'showAppName', true,
    'appName', 'KEMEX',
    'footerText', '',
    'primaryColor', '#0b7285',
    'paperSize', 'A4',
    'orientation', 'auto',
    'marginTopMm', 10,
    'marginRightMm', 12,
    'marginBottomMm', 42,
    'marginLeftMm', 12,
    'tableDensity', 'standard',
    'signatureMode', 'every-page',
    'signatureLabels', jsonb_build_array('إعداد', 'مراجعة', 'اعتماد')
  );

COMMENT ON COLUMN public.organization_settings.print_settings IS
  'Central administrator-controlled print presentation defaults for KEMEX reports and business documents.';
