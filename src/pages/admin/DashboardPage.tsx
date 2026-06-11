import { useState, useEffect } from "react";
import {
  Users,
  Building2,
  UserCheck,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  BarChart3,
  PieChart,
  X,
} from "lucide-react";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { Link } from "react-router-dom";
import { PROPERTY_STATUS_LABELS } from "../../utils/propertyEnums";

interface DashboardData {
  counters: {
    users: number;
    clients: number;
    properties: number;
    publicProperties: number;
  };
  propertiesByStatus: Array<{
    _count: { id: number };
    status: string;
  }>;
  priceAggregates: {
    _sum: {
      price: string;
      salePrice: string;
      commission: string;
    };
    _avg: {
      price: string;
      salePrice: string;
    };
  };
  latestProperties: Array<{
    id: string;
    code: string;
    address: string;
    price: string;
    propertyType: string;
    status: string;
    createdAt: string;
    advisor: {
      id: string;
      firstName: string;
      lastName: string;
    };
    files: Array<{
      file: {
        id: string;
        path: string;
        originalName: string;
      };
      fileType: string;
    }>;
  }>;
}

type DashboardModalType =
  | "properties"
  | "publicProperties"
  | "clients"
  | "users"
  | "statusProperties";

interface DashboardPropertyListItem {
  id: string;
  code: string;
  address: string;
  price: string | number;
  status: string;
  propertyType: string;
  isPublic?: boolean;
}

interface DashboardClientListItem {
  id: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone: string;
}

interface DashboardUserListItem {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  type: string;
  isActive?: boolean;
}

const MODAL_TITLES: Record<DashboardModalType, string> = {
  properties: "Total Propiedades",
  publicProperties: "Propiedades Públicas",
  clients: "Clientes Activos",
  users: "Usuarios Sistema",
  statusProperties: "Propiedades por Estado",
};

export const DashboardPage = () => {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange] = useState("7d");
  const [activeModal, setActiveModal] = useState<DashboardModalType | null>(
    null,
  );
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [propertyList, setPropertyList] = useState<DashboardPropertyListItem[]>(
    [],
  );
  const [clientList, setClientList] = useState<DashboardClientListItem[]>([]);
  const [userList, setUserList] = useState<DashboardUserListItem[]>([]);
  const [selectedStatusLabel, setSelectedStatusLabel] = useState<string>("");

  useEffect(() => {
    fetchDashboardData();
  }, [timeRange]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch dashboard data from /overview endpoint
      const response = await api.get("/dashboard/overview");
      setDashboardData(response.data);
    } catch (error: any) {
      console.error("Error fetching dashboard data:", error);
      setError(
        error.response?.data?.message ||
          "Error al cargar los datos del dashboard",
      );
    } finally {
      setLoading(false);
    }
  };

  const getPropertyImage = (property: any) => {
    const apiBase =
      (import.meta as any).env?.VITE_API_URL || "http://localhost:3000/api";
    const base = String(apiBase).replace(/\/$/, "");
    const firstImage = property.files?.find(
      (pf: any) => pf.fileType === "image",
    )?.file;
    return firstImage
      ? `${base}/public/files/${firstImage.id}`
      : "https://images.unsplash.com/photo-1600596542815-27b5c0b8aa2b?auto=format&fit=crop&w=200&q=80";
  };

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    return `$${num.toLocaleString()}`;
  };

  const closeModal = () => {
    setActiveModal(null);
    setModalError(null);
    setSelectedStatusLabel("");
  };

  const openDashboardModal = async (type: DashboardModalType) => {
    try {
      setActiveModal(type);
      setModalLoading(true);
      setModalError(null);

      if (type === "properties" || type === "publicProperties") {
        const response = await api.get("/properties");
        const properties = response.data as DashboardPropertyListItem[];
        setPropertyList(
          type === "publicProperties"
            ? properties.filter((property) => property.isPublic)
            : properties,
        );
        return;
      }

      if (type === "clients") {
        const response = await api.get("/clients");
        setClientList(response.data);
        return;
      }

      const response = await api.get("/users");
      setUserList(response.data);
    } catch (modalFetchError: any) {
      console.error("Error fetching modal data:", modalFetchError);
      setModalError(
        modalFetchError.response?.data?.message ||
          "No se pudo cargar el listado solicitado",
      );
    } finally {
      setModalLoading(false);
    }
  };

  const openStatusPropertiesModal = async (status: string) => {
    try {
      setActiveModal("statusProperties");
      setModalLoading(true);
      setModalError(null);
      setSelectedStatusLabel(PROPERTY_STATUS_LABELS[status] ?? status);

      const response = await api.get("/properties");
      const properties = response.data as DashboardPropertyListItem[];
      setPropertyList(
        properties.filter((property) => property.status === status),
      );
    } catch (modalFetchError: any) {
      console.error("Error fetching properties by status:", modalFetchError);
      setModalError(
        modalFetchError.response?.data?.message ||
          "No se pudo cargar el listado por estado",
      );
    } finally {
      setModalLoading(false);
    }
  };

  const StatCard = ({
    title,
    value,
    icon: Icon,
    color,
    trend,
    trendValue,
    onClick,
  }: any) => (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <div className="flex items-baseline gap-2 mt-2">
            <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
            {trend && trendValue && (
              <div
                className={`flex items-center gap-1 text-xs ${trend === "up" ? "text-green-600" : "text-red-600"}`}
              >
                {trend === "up" ? (
                  <ArrowUpRight className="w-3 h-3" />
                ) : (
                  <ArrowDownRight className="w-3 h-3" />
                )}
                <span>{trendValue}%</span>
              </div>
            )}
          </div>
        </div>
        <div className={`${color} p-3 rounded-lg text-white shadow-lg`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </button>
  );

  const renderModalContent = () => {
    if (modalLoading) {
      return (
        <div className="py-10 text-center text-gray-500">
          Cargando listado...
        </div>
      );
    }

    if (modalError) {
      return <div className="py-6 text-sm text-red-600">{modalError}</div>;
    }

    if (
      activeModal === "properties" ||
      activeModal === "publicProperties" ||
      activeModal === "statusProperties"
    ) {
      if (!propertyList.length) {
        return (
          <div className="py-10 text-center text-gray-500">
            No hay propiedades para mostrar.
          </div>
        );
      }

      return (
        <div className="space-y-3">
          {propertyList.map((property) => (
            <Link
              key={property.id}
              to={`/admin/propiedades/ver/${property.id}`}
              onClick={closeModal}
              className="block rounded-xl border border-gray-200 p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900">{property.code}</p>
                  <p className="text-sm text-gray-600 truncate">
                    {property.address}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {property.propertyType} ·{" "}
                    {PROPERTY_STATUS_LABELS[property.status] ?? property.status}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-semibold text-gray-900">
                    {formatCurrency(property.price)}
                  </p>
                  {property.isPublic !== undefined && (
                    <p className="text-xs text-gray-500">
                      {property.isPublic ? "Publica" : "Privada"}
                    </p>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      );
    }

    if (activeModal === "clients") {
      if (!clientList.length) {
        return (
          <div className="py-10 text-center text-gray-500">
            No hay clientes para mostrar.
          </div>
        );
      }

      return (
        <div className="space-y-3">
          {clientList.map((client) => (
            <Link
              key={client.id}
              to={`/admin/clientes/editar/${client.id}`}
              onClick={closeModal}
              className="block rounded-xl border border-gray-200 p-4 hover:bg-gray-50 transition-colors"
            >
              <p className="font-semibold text-gray-900">
                {client.firstName} {client.lastName}
              </p>
              <p className="text-sm text-gray-600">{client.phone}</p>
              {client.email && (
                <p className="text-xs text-gray-500 mt-1 truncate">
                  {client.email}
                </p>
              )}
            </Link>
          ))}
        </div>
      );
    }

    if (!userList.length) {
      return (
        <div className="py-10 text-center text-gray-500">
          No hay usuarios para mostrar.
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {userList.map((systemUser) => (
          <Link
            key={systemUser.id}
            to={`/admin/usuarios/editar/${systemUser.id}`}
            onClick={closeModal}
            className="block rounded-xl border border-gray-200 p-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-gray-900">
                  {systemUser.firstName} {systemUser.lastName}
                </p>
                <p className="text-sm text-gray-600">@{systemUser.username}</p>
                <p className="text-xs text-gray-500 mt-1 truncate">
                  {systemUser.email}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-medium text-gray-700">
                  {systemUser.type}
                </p>
                <p className="text-xs text-gray-500">
                  {systemUser.isActive ? "Activo" : "Inactivo"}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    );
  };

  const StatusChart = () => {
    if (!dashboardData?.propertiesByStatus?.length) return null;

    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Propiedades por Estado
          </h3>
          <PieChart className="w-5 h-5 text-gray-400" />
        </div>
        <div className="space-y-3">
          {dashboardData.propertiesByStatus.map((item, index) => {
            const colors = [
              "bg-blue-500",
              "bg-green-500",
              "bg-yellow-500",
              "bg-red-500",
              "bg-purple-500",
            ];

            return (
              <button
                type="button"
                key={item.status}
                onClick={() => openStatusPropertiesModal(item.status)}
                className="flex w-full items-center justify-between rounded-lg px-2 py-1 text-left hover:bg-gray-50"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-3 h-3 rounded-full ${colors[index % colors.length]}`}
                  ></div>
                  <span className="text-sm text-gray-700">
                    {PROPERTY_STATUS_LABELS[item.status] ?? item.status}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">
                    {item._count.id}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const PriceSummary = () => {
    if (!dashboardData?.priceAggregates) return null;

    const { _sum, _avg } = dashboardData.priceAggregates;
    const totalValue = parseFloat(_sum.price) || 0;
    const avgPrice = parseFloat(_avg.price) || 0;

    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Resumen de Precios
          </h3>
          <DollarSign className="w-5 h-5 text-gray-400" />
        </div>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">
              Valor Total de Propiedades:
            </span>
            <span className="text-lg font-semibold text-gray-900">
              {formatCurrency(totalValue)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Precio Promedio:</span>
            <span className="text-lg font-semibold text-gray-900">
              {formatCurrency(avgPrice)}
            </span>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-xl p-6 shadow-sm">
                <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-16"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <div className="text-red-600 mb-4">
            <svg
              className="w-12 h-12 mx-auto"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-red-800 mb-2">
            Error al cargar el dashboard
          </h3>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={fetchDashboardData}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <div className="text-yellow-600 mb-4">
            <BarChart3 className="w-12 h-12 mx-auto" />
          </div>
          <h3 className="text-lg font-semibold text-yellow-800 mb-2">
            Sin datos disponibles
          </h3>
          <p className="text-yellow-600">
            No hay datos para mostrar en el dashboard
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-3xl max-h-[85vh] overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {activeModal === "statusProperties" && selectedStatusLabel
                    ? `${MODAL_TITLES[activeModal]}: ${selectedStatusLabel}`
                    : MODAL_TITLES[activeModal]}
                </h2>
                <p className="text-sm text-gray-500">
                  Selecciona un elemento para abrir su vista correspondiente.
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
              {renderModalContent()}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Bienvenido de vuelta, {user?.firstName}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="7d">Últimos 7 días</option>
            <option value="30d">Últimos 30 días</option>
            <option value="90d">Últimos 90 días</option>
          </select> */}

          <button
            onClick={fetchDashboardData}
            className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Propiedades"
          value={dashboardData.counters.properties}
          icon={Building2}
          color="bg-blue-500"
          onClick={() => openDashboardModal("properties")}
        />
        <StatCard
          title="Clientes Activos"
          value={dashboardData.counters.clients}
          icon={UserCheck}
          color="bg-green-500"
          onClick={() => openDashboardModal("clients")}
        />
        <StatCard
          title="Usuarios Sistema"
          value={dashboardData.counters.users}
          icon={Users}
          color="bg-purple-500"
          onClick={() => openDashboardModal("users")}
        />
        <StatCard
          title="Propiedades Públicas"
          value={dashboardData.counters.publicProperties}
          icon={Building2}
          color="bg-orange-500"
          onClick={() => openDashboardModal("publicProperties")}
        />
      </div>

      {/* Charts and Recent Data */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Properties */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                Propiedades Recientes
              </h3>
              {/* <div className="flex items-center gap-2">
                <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                  <Filter className="w-4 h-4" />
                </button>
                <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                  <Download className="w-4 h-4" />
                </button>
              </div> */}
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {dashboardData.latestProperties.map((property) => (
                <Link
                  key={property.id}
                  to={`/admin/propiedades/ver/${property.id}`}
                  className="flex items-center gap-4 p-4 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <img
                    src={getPropertyImage(property)}
                    alt={property.code}
                    className="w-16 h-16 rounded-lg object-cover"
                  />
                  <div className="flex-1 w-full overflow-hidden">
                    <h4 className="font-semibold text-gray-900">
                      {property.code}
                    </h4>
                    <p className="text-sm text-gray-600 truncate">
                      {property.address}
                    </p>
                    <p className="text-xs text-gray-500">
                      {property.propertyType}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">
                      {formatCurrency(property.price)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {PROPERTY_STATUS_LABELS[property.status] ??
                        property.status}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Charts Column */}
        <div className="space-y-6">
          <StatusChart />
          <PriceSummary />
        </div>
      </div>
    </div>
  );
};
