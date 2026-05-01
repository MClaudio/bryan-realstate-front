import { useState, useEffect } from "react";
import {
  Users,
  Building2,
  UserCheck,
  DollarSign,
  Eye,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  BarChart3,
  PieChart,
} from "lucide-react";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";

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

export const DashboardPage = () => {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange] = useState("7d");

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

  const StatCard = ({
    title,
    value,
    icon: Icon,
    color,
    trend,
    trendValue,
  }: any) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
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
    </div>
  );

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
              <div
                key={item.status}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-3 h-3 rounded-full ${colors[index % colors.length]}`}
                  ></div>
                  <span className="text-sm text-gray-700">{item.status}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">
                    {item._count.id}
                  </span>
                </div>
              </div>
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
        />
        <StatCard
          title="Clientes Activos"
          value={dashboardData.counters.clients}
          icon={UserCheck}
          color="bg-green-500"
        />
        <StatCard
          title="Usuarios Sistema"
          value={dashboardData.counters.users}
          icon={Users}
          color="bg-purple-500"
        />
        <StatCard
          title="Propiedades Públicas"
          value={dashboardData.counters.publicProperties}
          icon={Building2}
          color="bg-orange-500"
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
                <div
                  key={property.id}
                  className="flex items-center gap-4 p-4 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <img
                    src={getPropertyImage(property)}
                    alt={property.code}
                    className="w-16 h-16 rounded-lg object-cover"
                  />
                  <div className="flex-1">
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
                    <p className="text-xs text-gray-500">{property.status}</p>
                  </div>
                  <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
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
