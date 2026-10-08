import { useState, useEffect } from "react";
import {
  Plus,
  Edit,
  Trash2,
  Search,
  Eye,
  RefreshCw,
  Star,
  ToggleLeft,
  ToggleRight,
  Building,
  ListChecks,
} from "lucide-react";
import api, { resolveFileUrl } from "../../../services/api";
import { Link, useNavigate } from "react-router-dom";
import { alertConfirm, alertError, toastSuccess } from "../../../utils/alerts";
import {
  PROPERTY_STATUS_LABELS,
  PROPERTY_STATUS_COLORS,
  PROPERTY_TYPE_LABELS,
} from "../../../utils/propertyEnums";
import { PropertyChecklistModal } from "./PropertyChecklistModal";
import { ProgressBar } from "../../../components/common/ProgressBar";
import {
  PAYMENT_METHOD_LABELS,
  type SaleProcess,
} from "../../../utils/saleProcess";

interface Property {
  id: string;
  code: string;
  address: string;
  owner?: string | null;
  cityId?: string | null;
  referenceSector?: string | null;
  price: number;
  propertyType: string;
  status: string;
  isFeatured: boolean;
  isActive: boolean;
  isPublic: boolean;
  city?: {
    id: string;
    name: string;
  } | null;
  advisor: {
    firstName: string;
    lastName: string;
  };
  createdAt: string;
  files: Array<{
    sortOrder?: number;
    createdAt?: string;
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
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [checklistProperty, setChecklistProperty] = useState<Property | null>(
    null,
  );
  const [saleProcesses, setSaleProcesses] = useState<
    Record<string, SaleProcess>
  >({});

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    try {
      setLoading(true);
      const response = await api.get("/properties");
      setProperties(response.data);
      // Progress bars are non-critical: the list still shows if this fails.
      api
        .get<SaleProcess[]>("/sale-processes")
        .then((res) =>
          setSaleProcesses(
            Object.fromEntries(res.data.map((p) => [p.propertyId, p])),
          ),
        )
        .catch(() => setSaleProcesses({}));
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

  const togglePublic = async (id: string, currentStatus: boolean) => {
    try {
      await api.patch(`/properties/${id}`, { isPublic: !currentStatus });
      toastSuccess(
        `Propiedad ${!currentStatus ? "publicada" : "retirada de la web pública"}`,
      );
      fetchProperties();
    } catch (error) {
      console.error("Error updating public status:", error);
      alertError("Error", "No se pudo actualizar la publicación");
    }
  };

  const getPropertyImage = (property: Property) => {
    const firstImage = property.files
      ?.filter((pf) => pf.fileType === "image")
      .sort((a, b) => {
        const orderA = a.sortOrder ?? Number.MAX_SAFE_INTEGER;
        const orderB = b.sortOrder ?? Number.MAX_SAFE_INTEGER;

        if (orderA !== orderB) return orderA - orderB;

        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;

        return dateA - dateB;
      })[0]?.file;

    return firstImage && resolveFileUrl(firstImage)
      ? resolveFileUrl(firstImage)
      : "https://images.unsplash.com/photo-1600596542815-27b5c0b8aa2b?auto=format&fit=crop&w=200&q=80";
  };

  const filteredProperties = properties.filter((property) => {
    const matchesSearch =
      property.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      property.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      property.city?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      property.referenceSector
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase());
    const matchesStatus = !statusFilter || property.status === statusFilter;
    const matchesType = !typeFilter || property.propertyType === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  const propertyTypes = Object.keys(PROPERTY_TYPE_LABELS);
  const propertyStatuses = ["Validacion", "Nuevo", "Negociacion", "Vendido"];

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
          to="/admin/propiedades/nueva"
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

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="lg:w-48 px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Filtrar por estado"
          >
            <option value="">Todos los estados</option>
            {propertyStatuses.map((status) => (
              <option key={status} value={status}>
                {PROPERTY_STATUS_LABELS[status] ?? status}
              </option>
            ))}
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="lg:w-48 px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Filtrar por tipo"
          >
            <option value="">Todos los tipos</option>
            {propertyTypes.map((type) => (
              <option key={type} value={type}>
                {PROPERTY_TYPE_LABELS[type]}
              </option>
            ))}
          </select>

          <button
            onClick={fetchProperties}
            className="flex items-center justify-center gap-2 px-4 py-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw size={20} /> Actualizar
          </button>
        </div>
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
              role="link"
              tabIndex={0}
              onClick={(e) => {
                // Buttons and links inside the card keep their own action.
                if ((e.target as HTMLElement).closest("a, button")) return;
                navigate(`/admin/propiedades/ver/${property.id}`);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && e.target === e.currentTarget) {
                  navigate(`/admin/propiedades/ver/${property.id}`);
                }
              }}
              className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    className={`px-2 py-1 rounded-full text-xs font-semibold ${PROPERTY_STATUS_COLORS[property.status] ?? "bg-gray-100 text-gray-700"}`}
                  >
                    {PROPERTY_STATUS_LABELS[property.status] ?? property.status}
                  </span>
                </div>

                {/* Public/Private Toggle */}
                <div className="absolute top-3 right-3">
                  <button
                    onClick={() => togglePublic(property.id, property.isPublic)}
                    className={`p-2 rounded-full transition-colors ${
                      property.isPublic
                        ? "bg-green-100 text-green-600"
                        : "bg-gray-100 text-gray-400"
                    }`}
                    title={
                      property.isPublic
                        ? "Pública (clic para ocultar de la web)"
                        : "No pública (clic para publicar)"
                    }
                  >
                    {property.isPublic ? (
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
                    {(property.city?.name || property.referenceSector) && (
                      <p className="text-xs text-gray-500 truncate">
                        {[property.city?.name, property.referenceSector]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    )}
                  </div>
                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">
                    {PROPERTY_TYPE_LABELS[property.propertyType] ??
                      property.propertyType}
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

                {saleProcesses[property.id] && (
                  <div className="mb-4 px-3 py-2 rounded-lg bg-gray-50 border border-gray-100">
                    <div className="text-xs font-semibold text-gray-600 mb-1">
                      Proceso ·{" "}
                      {
                        PAYMENT_METHOD_LABELS[
                          saleProcesses[property.id].paymentMethod
                        ]
                      }
                    </div>
                    <ProgressBar
                      value={saleProcesses[property.id].progress}
                      size="sm"
                    />
                  </div>
                )}

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
                      to={`/admin/propiedades/ver/${property.id}`}
                      className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                      title="Ver detalles"
                    >
                      <Eye size={16} />
                    </Link>
                    <button
                      className="p-2 text-gray-400 hover:text-emerald-600 transition-colors"
                      title="Checklist"
                      onClick={() => setChecklistProperty(property)}
                    >
                      <ListChecks size={16} />
                    </button>
                    <Link
                      to={`/admin/propiedades/editar/${property.id}`}
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

      {checklistProperty && (
        <PropertyChecklistModal
          property={checklistProperty}
          onClose={() => setChecklistProperty(null)}
        />
      )}
    </div>
  );
};
