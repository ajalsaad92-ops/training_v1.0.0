import { Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/hooks/useSupabaseData";
import { useUITheme } from "@/contexts/UIThemeContext";
import { localDb } from "@/lib/localStore";
import AppSidebar from "@/components/AppSidebar";
import TopNav from "@/components/TopNav";
import NoirNav from "@/components/NoirNav";
import ThemeSwitcher from "@/components/ThemeSwitcher";
import { useErrorMonitorCount, openErrorMonitor } from "@/hooks/useErrorMonitor";
import { Loader2, Menu, X, Bell, Check, Info, AlertTriangle, Bug } from "lucide-react";
import { useState, useRef, useEffect } from "react";

const Layout = () => {
  const { user, loading } = useAuth();
  const { theme } = useUITheme();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const { data: notifications, refetch: refetchNotifications } = useNotifications();
  const notifRef = useRef<HTMLDivElement>(null);
  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const errMon = useErrorMonitorCount();

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    if (notifOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [notifOpen]);

  const markAllRead = () => {
    notifications.filter((n) => !n.is_read).forEach((n) => localDb.notifications.update(n.id, { is_read: true }));
    refetchNotifications();
  };

  const openNotification = (n: { id: string; is_read?: boolean; link?: string | null }) => {
    if (!n.is_read) { localDb.notifications.update(n.id, { is_read: true }); refetchNotifications(); }
    setNotifOpen(false); setMobileMenuOpen(false);
    if (n.link) navigate(n.link);
  };

  const notifIcon = (type: string) => type === "warning"
    ? <AlertTriangle className="w-4 h-4 text-warning shrink-0" />
    : <Info className="w-4 h-4 text-primary shrink-0" />;

  if (loading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  // === Aurora theme: top navigation ===
  if (theme === "aurora") {
    return (
      <div className="min-h-screen w-full aurora-bg flex flex-col">
        <TopNav />
        <main className="flex-1 min-w-0 relative animate-fade-in">
          <Outlet />
        </main>
        <ThemeSwitcher />
      </div>
    );
  }

  // === Noir theme: editorial top + floating dock ===
  if (theme === "noir") {
    return (
      <div className="min-h-screen w-full noir-bg flex flex-col">
        <NoirNav />
        <main className="flex-1 min-w-0 relative animate-fade-in pb-28">
          <Outlet />
        </main>
        <ThemeSwitcher />
      </div>
    );
  }

  // === Classic theme: original sidebar ===
  return (
    <div className="flex h-screen w-full overflow-hidden">
      <div className="fixed top-0 left-0 right-0 z-50 bg-sidebar text-sidebar-foreground flex items-center justify-between px-4 py-3 md:hidden">
        <button onClick={() => setNotifOpen(!notifOpen)} className="relative p-1">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center font-bold">{unreadCount}</span>}
        </button>
        <h1 className="font-bold text-sm text-sidebar-accent-foreground">نظام التدريب</h1>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-1">
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {mobileMenuOpen && <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={() => setMobileMenuOpen(false)} />}

      <div className={`fixed inset-y-0 right-0 z-40 transform transition-transform duration-300 ease-in-out md:relative md:transform-none ${mobileMenuOpen ? "translate-x-0" : "translate-x-full md:translate-x-0"}`}>
        <AppSidebar onNavigate={() => setMobileMenuOpen(false)} />
      </div>

      <main className="flex-1 min-w-0 overflow-y-auto relative flex flex-col pt-12 md:pt-0">
        <div className="hidden md:block absolute top-3 left-3 z-30" ref={notifRef}>
          <button onClick={() => setNotifOpen(!notifOpen)} className="relative p-2 rounded-lg bg-card border border-border hover:shadow-md transition-shadow">
            <Bell className="w-5 h-5 text-foreground" />
            {unreadCount > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center font-bold animate-pulse">{unreadCount}</span>}
          </button>

          {notifOpen && (
            <div className="absolute top-12 left-0 w-80 bg-card border border-border rounded-xl shadow-xl overflow-hidden z-50 animate-slide-down" dir="rtl">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-muted/30">
                <span className="text-sm font-bold text-foreground">الإشعارات ({unreadCount} غير مقروءة)</span>
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="text-xs text-primary hover:underline flex items-center gap-1"><Check className="w-3 h-3" />تعليم الكل كمقروء</button>
                )}
              </div>
              <div className="max-h-72 overflow-y-auto">
                {notifications.length > 0 ? notifications.map(n => (
                  <button key={n.id} type="button" onClick={() => openNotification(n)}
                    className={`w-full text-right flex items-start gap-3 px-4 py-3 border-b border-border/50 hover:bg-muted/40 transition-colors ${!n.is_read ? "bg-primary/5" : ""} ${n.link ? "cursor-pointer" : "cursor-default"}`}>
                    {notifIcon(n.type)}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${!n.is_read ? "font-semibold text-foreground" : "text-foreground"}`}>{n.message}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{n.date}</p>
                    </div>
                    {!n.is_read && <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />}
                  </button>
                )) : <div className="py-8 text-center text-muted-foreground text-sm">لا توجد إشعارات</div>}
              </div>
            </div>
          )}
        </div>

        <Outlet />
      </main>
      <ThemeSwitcher />
    </div>
  );
};

export default Layout;
