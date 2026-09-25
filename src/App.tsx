import { Suspense, useCallback, useEffect, useMemo } from 'react'
import { HashRouter, useLocation, useNavigate } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'
import { Layout } from './components/Layout'
import { LoginPage } from './pages/LoginPage'
import { ChangePasswordPage } from './pages/ChangePasswordPage'
import { repository } from './services/repositoryFactory'
import { useAuth } from './features/auth'
import { CurrencyProvider } from './features/settings'
import { useKemexBootstrap } from './features/app/hooks/useKemexBootstrap'
import { useKemexMutations } from './features/app/hooks/useKemexMutations'
import { DriverPortal } from './pages/driver/DriverPortal'
import { AppRoutes } from './app/routing/AppRoutes'
import { ROUTE_DESCRIPTIONS } from './app/routing/routeRegistry'
import type { Driver, Operation } from './types/tfms'
import { useNotifications } from './features/notifications/useNotifications'

function daysTo(value: string) {
  return Math.ceil((new Date(value).getTime() - Date.now()) / 86400000)
}

function descriptionFor(key: string) {
  return ROUTE_DESCRIPTIONS[key] ?? 'وحدة من وحدات إدارة النقل والأسطول.'
}

function AppInner() {
  const { user, loading: authLoading, error: authError, login, logout, changePassword } = useAuth()
  const location = useLocation()
  const routerNavigate = useNavigate()
  const route = location.pathname.replace(/^\//, '') || 'dashboard'

  const bootstrapUserId = user?.role === 'driver' ? undefined : user?.id && !user.mustChangePassword ? user.id : undefined
  const bootstrapQuery = useKemexBootstrap(bootstrapUserId, route)
  const assets = bootstrapQuery.data?.assets ?? []
  const projects = bootstrapQuery.data?.projects ?? []
  const workOrders = bootstrapQuery.data?.workOrders ?? []
  const clients = bootstrapQuery.data?.clients ?? []
  const costCenters = bootstrapQuery.data?.costCenters ?? []
  const assetTypes = bootstrapQuery.data?.assetTypes ?? []
  const chargingRates = bootstrapQuery.data?.chargingRates ?? []
  const warehouses = bootstrapQuery.data?.warehouses ?? []
  const inventoryItems = bootstrapQuery.data?.inventoryItems ?? []
  const stockMovements = bootstrapQuery.data?.stockMovements ?? []
  const trips = bootstrapQuery.data?.trips ?? []
  const tripCosts = bootstrapQuery.data?.tripCosts ?? []
  const maintenanceTechnicians = bootstrapQuery.data?.maintenanceTechnicians ?? []
  const fuelOps = bootstrapQuery.data?.fuelOps ?? []
  const moduleData = bootstrapQuery.data?.moduleData ?? {}
  const approvalEvents = bootstrapQuery.data?.approvalEvents ?? []
  const systemSettings = bootstrapQuery.data?.settings ?? {
    alertDays: 30,
    alertKm: 1500,
    alertHours: 80,
    vat: 0,
    diesel: 0,
    petrol: 0,
    currencyCode: 'EGP',
  }

  const navigate = useCallback((next: string) => routerNavigate(`/${next}`), [routerNavigate])

  useEffect(() => {
    localStorage.removeItem('tfms-web-demo-v1')
  }, [])

  useEffect(() => {
    repository.clearAuditActor()
    if (user) repository.setAuditActor(user)
  }, [user])

  const {
    error: mutationError,
    saveProject,
    saveClient,
    saveAsset,
    saveMaintenanceTechnician,
    saveWarehouse,
    saveInventoryItem,
    createInventoryItem,
    postStockMovement,
    receivePurchase,
    saveWorkOrder,
    saveFuelOperation,
    saveModule,
    createPurchaseFromInventory,
    workflowModule,
    deleteModule,
    invalidateData,
    clearBootstrapCache,
  } = useKemexMutations({
    userId: user?.id,
    userName: user?.name,
    route,
    assets,
    workOrders,
    moduleData,
    navigate,
  })

  const bootstrapError = useMemo(() => {
    if (!bootstrapQuery.data?.failures?.length) return ''
    return `تعذر تحميل بعض البيانات؛ يمكنك متابعة استخدام الأجزاء المتاحة. ${bootstrapQuery.data.failures.join(' | ')}`
  }, [bootstrapQuery.data?.failures])

  async function handleLogin(username: string, password: string) {
    await login(username, password)
    routerNavigate('/dashboard')
  }

  async function handleLogout() {
    await logout()
    clearBootstrapCache()
  }

  const { notifications, unreadCount: notificationUnreadCount, loading: notificationsLoading, error: notificationsError, refresh: onRefreshNotifications, markRead: onMarkNotificationRead, markAllRead: onMarkAllRead } = useNotifications(user?.id)

  const alertCount = useMemo(
    () => assets.filter(asset => (asset.lic ? daysTo(asset.lic) <= 30 : false) || ['تحت الصيانة', 'بانتظار الإصلاح', 'بانتظار الفحص'].includes(asset.status)).length,
    [assets],
  )

  if (authLoading) return <div className="loading-page"><div className="spinner" /><strong>جارٍ التحقق من جلسة المستخدم...</strong></div>
  if (!user) return <LoginPage onLogin={handleLogin} />
  if (user.mustChangePassword) return <ChangePasswordPage user={user} onChangePassword={changePassword} onLogout={handleLogout} />
  if (user.role === 'driver') return <DriverPortal user={user} onLogout={handleLogout} />
  if (bootstrapQuery.isPending) return <div className="loading-page"><div className="spinner" /><strong>جارٍ تحميل بيانات KEMEX...</strong></div>

  const drivers = (moduleData.drivers as Driver[]) || []
  const operations = (moduleData.operations as unknown as Operation[]) || []

  return <CurrencyProvider currencyCode={systemSettings.currencyCode}>
    <Layout user={user} route={route} onRoute={navigate} onLogout={handleLogout} alertCount={alertCount} notifications={notifications} notificationUnreadCount={notificationUnreadCount} notificationsLoading={notificationsLoading} onRefreshNotifications={onRefreshNotifications} onMarkNotificationRead={onMarkNotificationRead} onMarkAllRead={onMarkAllRead}>
      {(authError || mutationError || bootstrapError || notificationsError) && (
        <div className="global-error">
          <AlertTriangle size={17} />
          <span>{authError || mutationError || bootstrapError || notificationsError}</span>
        </div>
      )}
      <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center', color: 'var(--tfms-muted)' }}>...جارٍ التحميل</div>}>
        <AppRoutes
          user={user}
          assets={assets}
          projects={projects}
          workOrders={workOrders}
          clients={clients}
          costCenters={costCenters}
          assetTypes={assetTypes}
          chargingRates={chargingRates}
          warehouses={warehouses}
          inventoryItems={inventoryItems}
          stockMovements={stockMovements}
          trips={trips}
          tripCosts={tripCosts}
          maintenanceTechnicians={maintenanceTechnicians}
          fuelOps={fuelOps}
          moduleData={moduleData}
          approvalEvents={approvalEvents}
          systemSettings={systemSettings}
          navigate={navigate}
          saveProject={saveProject}
          saveClient={saveClient}
          saveAsset={saveAsset}
          saveMaintenanceTechnician={saveMaintenanceTechnician}
          saveWarehouse={saveWarehouse}
          saveInventoryItem={saveInventoryItem}
          createInventoryItem={createInventoryItem}
          postStockMovement={postStockMovement}
          receivePurchase={receivePurchase}
          saveWorkOrder={saveWorkOrder}
          saveFuelOperation={saveFuelOperation}
          saveModule={saveModule}
          createPurchaseFromInventory={createPurchaseFromInventory}
          workflowModule={workflowModule}
          deleteModule={deleteModule}
          invalidateData={invalidateData}
          notifications={notifications}
          notificationUnreadCount={notificationUnreadCount}
          notificationsLoading={notificationsLoading}
          onRefreshNotifications={onRefreshNotifications}
          onMarkNotificationRead={onMarkNotificationRead}
          onMarkAllRead={onMarkAllRead}
        />
      </Suspense>
    </Layout>
  </CurrencyProvider>
}

// HashRouter preserves the existing #/route URL scheme while delegating route matching
// to React Router rather than a hand-rolled hashchange/regex dispatcher.
export default function App() {
  return <HashRouter><AppInner /></HashRouter>
}
