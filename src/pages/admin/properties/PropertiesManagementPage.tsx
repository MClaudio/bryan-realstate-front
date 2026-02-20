import { useState, useEffect } from "react";
import {
  Plus,
  Edit,
  Trash2,
  Search,
  Eye,
  Filter,
  Download,
  RefreshCw,
  Star,
  ToggleLeft,
  ToggleRight,
  Building,
} from "lucide-react";
import api from "../../../services/api";
import { Link } from "react-router-dom";
import { alertConfirm, alertError, toastSuccess } from "../../../utils/alerts";

interface Property {
  id: string;
  code: string;
  address: string;
  price: number;
  propertyType: string;
  status: string;
  isFeatured: boolean;
  isActive: boolean;
  advisor: {
    firstName: string;
    lastName: string;
  };
  createdAt: string;
  files: Array<{
    file: {
      id: string;
      path: string;
    };
    fileType: string;
  }>;
}

export const PropertiesManagementPage = () => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    try {
      setLoading(true);
      const response = await api.get("/properties");
      setProperties(response.data);
    } catch (error) {
      console.error("Error fetching properties:", error);
      alertError("Error", "No se pudieron cargar las propiedades");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    const confirm = await alertConfirm(
      "Eliminar propiedad",
      "¿Estás seguro de eliminar esta propiedad?",
    );
    if (!confirm.isConfirmed) return;

    try {
      await api.delete(`/properties/${id}`);
      toastSuccess("Propiedad eliminada exitosamente");
      fetchProperties();
    } catch (error: any) {
      console.error("Error deleting property:", error);
      const msg =
        error.response?.data?.message || "No se pudo eliminar la propiedad.";
      alertError("Error al eliminar", msg);
    }
  };

  const toggleFeatured = async (id: string, currentStatus: boolean) => {
    try {
      await api.patch(`/properties/${id}`, { isFeatured: !currentStatus });
      toastSuccess(
        `Propiedad ${!currentStatus ? "destacada" : "quitada de destacados"}`,
      );
      fetchProperties();
    } catch (error) {
      console.error("Error updating featured status:", error);
      alertError("Error", "No se pudo actualizar el estado de destacado");
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      await api.patch(`/properties/${id}`, { isActive: !currentStatus });
      toastSuccess(`Propiedad ${!currentStatus ? "activada" : "desactivada"}`);
      fetchProperties();
    } catch (error) {
      console.error("Error updating active status:", error);
      alertError("Error", "No se pudo actualizar el estado activo");
    }
  };

  const getPropertyImage = (property: Property) => {
    const apiBase =
      (import.meta as any).env?.VITE_API_URL || "http://localhost:3000/api";
    const base = String(apiBase).replace(/\/$/, "");
    const firstImage = property.files?.find(
      (pf) => pf.fileType === "image",
    )?.file;
    return firstImage
      ? `${base}/public/files/${firstImage.id}`
      : "https://images.unsplash.com/photo-1600596542815-27b5c0b8aa2b?auto=format&fit=crop&w=200&q=80";
  };

  const filteredProperties = properties.filter((property) => {
    const matchesSearch =
      property.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      property.address.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !statusFilter || property.status === statusFilter;
    const matchesType = !typeFilter || property.propertyType === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  const propertyTypes = [
    "Casa",
    "Terreno",
    "Casa y terreno",
    "Departamento",
    "Finca",
    "Lote",
  ];
  const propertyStatuses = ["Nuevo", "Negociación", "Vendido"];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Gestión de Propiedades
          </h1>
          <p className="text-gray-600 mt-1">
            Administra todas las propiedades del sistema
          </p>
        </div>

        <Link
          to="/propiedades/nueva"
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center gap-2"
        >
          <Plus size={20} /> Nueva Propiedad
        </Link>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={20}
            />
            <input
              type="text"
              placeholder="Buscar por código o dirección..."
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Filter size={20} /> Filtros
            </button>

            <button
              onClick={fetchProperties}
              className="flex items-center gap-2 px-4 py-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <RefreshCw size={20} /> Actualizar
            </button>
          </div>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-1 md:grid-cols-2 gap-4">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos los estados</option>
              {propertyStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos los tipos</option>
              {propertyTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Results Summary */}
      <div className="flex items-center justify-between">
        <p className="text-gray-600">
          Mostrando {filteredProperties.length} de {properties.length}{" "}
          propiedades
        </p>

        {/* <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <Download size={16} /> Exportar
          </button>
        </div> */}
      </div>

      {/* Properties Grid */}
      {loading ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <div className="animate-pulse">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="border border-gray-200 rounded-lg p-4">
                  <div className="h-32 bg-gray-200 rounded-lg mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : filteredProperties.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <Building className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No se encontraron propiedades
          </h3>
          <p className="text-gray-600 mb-4">
            Intenta ajustar tus filtros o criterios de búsqueda
          </p>
          <button
            onClick={() => {
              setSearchTerm("");
              setStatusFilter("");
              setTypeFilter("");
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Limpiar filtros
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProperties.map((property) => (
            <div
              key={property.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
            >
              {/* Property Image */}
              <div className="relative h-48 bg-gray-100">
                <img
                  src={getPropertyImage(property)}
                  alt={property.code}
                  className="w-full h-full object-cover"
                />

                {/* Badges */}
                <div className="absolute top-3 left-3 flex gap-2">
                  {property.isFeatured && (
                    <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                      <Star size={12} className="fill-current" />
                      Destacada
                    </span>
                  )}
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      property.status === "Nuevo"
                        ? "bg-green-100 text-green-700"
                        : property.status === "Vendido"
                          ? "bg-gray-100 text-gray-700"
                          : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {property.status}
                  </span>
                </div>

                {/* Active/Inactive Toggle */}
                <div className="absolute top-3 right-3">
                  <button
                    onClick={() => toggleActive(property.id, property.isActive)}
                    className={`p-2 rounded-full transition-colors ${
                      property.isActive
                        ? "bg-green-100 text-green-600"
                        : "bg-gray-100 text-gray-400"
                    }`}
                    title={
                      property.isActive
                        ? "Propiedad activa"
                        : "Propiedad inactiva"
                    }
                  >
                    {property.isActive ? (
                      <ToggleRight size={16} />
                    ) : (
                      <ToggleLeft size={16} />
                    )}
                  </button>
                </div>
              </div>

              {/* Property Details */}
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900 text-lg">
                      {property.code}
                    </h3>
                    <p className="text-sm text-gray-600 truncate">
                      {property.address}
                    </p>
                  </div>
                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">
                    {property.propertyType}
                  </span>
                </div>

                <div className="mb-4">
                  <p className="text-2xl font-bold text-gray-900">
                    ${Number(property.price).toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-500">
                    Asesor: {property.advisor?.firstName}{" "}
                    {property.advisor?.lastName}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  {/* <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        toggleFeatured(property.id, property.isFeatured)
                      }
                      className={`p-2 rounded-lg transition-colors ${
                        property.isFeatured
                          ? "bg-yellow-100 text-yellow-600 hover:bg-yellow-200"
                          : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                      }`}
                      title={
                        property.isFeatured
                          ? "Quitar de destacados"
                          : "Marcar como destacada"
                      }
                    >
                      <Star
                        size={16}
                        className={property.isFeatured ? "fill-current" : ""}
                      />
                    </button>
                  </div> */}

                  <div className="flex items-center gap-2">
                    <Link
                      to={`/propiedades/ver/${property.id}`}
                      className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                      title="Ver detalles"
                    >
                      <Eye size={16} />
                    </Link>
                    <Link
                      to={`/propiedades/editar/${property.id}`}
                      className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                      title="Editar"
                    >
                      <Edit size={16} />
                    </Link>
                    <button
                      className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                      title="Eliminar"
                      onClick={() => handleDelete(property.id)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
