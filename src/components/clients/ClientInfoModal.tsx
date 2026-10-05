import { useEffect, useState, type ReactNode } from 'react';
import { isAxiosError } from 'axios';
import {
  Calendar,
  FileText,
  Hash,
  Heart,
  Loader2,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Sparkles,
  StickyNote,
  User,
  X,
} from 'lucide-react';
import api from '../../services/api';

interface ClientInfo {
  id: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone: string;
  address?: string | null;
  ruc?: string | null;
  birthDate?: string | null;
  notes?: string | null;
  interestDescription?: string | null;
  createdAt?: string;
}

/** Datos del interés del cliente en la propiedad desde donde se abre la ficha (opcional). */
export interface ClientInterestContext {
  level?: string;
  levelClassName?: string;
  date?: string;
  reason?: string | null;
  source?: 'manual' | 'ia';
}

interface Props {
  clientId: string;
  onClose: () => void;
  interest?: ClientInterestContext;
}

const formatDate = (value?: string | null) =>
  value
    ? new Date(value).toLocaleDateString('es-EC', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC' })
    : null;

const InfoRow = ({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) => (
  <div className="flex items-start gap-3">
    <div className="mt-0.5 text-gray-400">{icon}</div>
    <div className="min-w-0">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{label}</p>
      <div className="text-sm text-gray-800 break-words">{children}</div>
    </div>
  </div>
);

/** Ficha del cliente de solo lectura: no permite editar. */
export const ClientInfoModal = ({ clientId, onClose, interest }: Props) => {
  const [client, setClient] = useState<ClientInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // El modal se monta cada vez que se abre: el estado inicial ya es "cargando".
  useEffect(() => {
    let active = true;
    api
      .get<ClientInfo>(`/clients/${clientId}`)
      .then((res) => active && setClient(res.data))
      .catch((err) => {
        if (!active) return;
        setError(
          (isAxiosError(err) && err.response?.status === 404 && 'El cliente ya no existe.') ||
            'No se pudo cargar la información del cliente.',
        );
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [clientId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const fullName = client ? `${client.firstName} ${client.lastName}`.replace(/\s+/g, ' ').trim() : '';
  const whatsappNumber = client?.phone?.replace(/\D/g, '');

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Información del cliente"
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 p-5 border-b border-gray-100">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 rounded-full bg-pink-50 shrink-0">
              <User size={20} className="text-pink-500" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-gray-900 truncate">
                {loading ? 'Cargando…' : fullName || 'Cliente'}
              </h2>
              <p className="text-xs text-gray-500">Ficha del cliente · solo lectura</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-5">
          {loading && (
            <div className="flex items-center justify-center gap-2 py-10 text-gray-500">
              <Loader2 size={18} className="animate-spin" /> Cargando información…
            </div>
          )}

          {!loading && error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
          )}

          {!loading && client && (
            <>
              {interest && (interest.level || interest.reason) && (
                <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-gray-800">Interés en esta propiedad</span>
                    {interest.level && (
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-semibold ${interest.levelClassName ?? 'bg-gray-100 text-gray-700'}`}
                      >
                        {interest.level}
                      </span>
                    )}
                    {interest.source && (
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                          interest.source === 'ia' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {interest.source === 'ia' && <Sparkles size={10} />}
                        {interest.source === 'ia' ? 'IA' : 'Manual'}
                      </span>
                    )}
                    {interest.date && <span className="text-xs text-gray-500">{formatDate(interest.date)}</span>}
                  </div>
                  {interest.reason && <p className="text-sm text-gray-700">{interest.reason}</p>}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InfoRow icon={<Phone size={16} />} label="Teléfono">
                  <a href={`tel:${client.phone}`} className="text-blue-600 hover:underline">
                    {client.phone}
                  </a>
                  {whatsappNumber && (
                    <a
                      href={`https://wa.me/${whatsappNumber}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-2 inline-flex items-center gap-1 text-xs text-green-600 hover:underline"
                    >
                      <MessageCircle size={12} /> WhatsApp
                    </a>
                  )}
                </InfoRow>
                <InfoRow icon={<Mail size={16} />} label="Email">
                  {client.email ? (
                    <a href={`mailto:${client.email}`} className="text-blue-600 hover:underline">
                      {client.email}
                    </a>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </InfoRow>
                <InfoRow icon={<Calendar size={16} />} label="Fecha de nacimiento">
                  {formatDate(client.birthDate) ?? <span className="text-gray-400">—</span>}
                </InfoRow>
                <InfoRow icon={<Hash size={16} />} label="RUC / CI">
                  {client.ruc || <span className="text-gray-400">—</span>}
                </InfoRow>
                <div className="sm:col-span-2">
                  <InfoRow icon={<MapPin size={16} />} label="Dirección">
                    {client.address || <span className="text-gray-400">—</span>}
                  </InfoRow>
                </div>
              </div>

              <div className="border-t border-gray-100 pt-4 space-y-4">
                <InfoRow icon={<Heart size={16} />} label="Intereses">
                  {client.interestDescription ? (
                    <p className="whitespace-pre-line">{client.interestDescription}</p>
                  ) : (
                    <span className="text-gray-400">Sin intereses registrados</span>
                  )}
                </InfoRow>
                <InfoRow icon={<StickyNote size={16} />} label="Nota">
                  {client.notes ? (
                    <p className="whitespace-pre-line">{client.notes}</p>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </InfoRow>
                {client.createdAt && (
                  <InfoRow icon={<FileText size={16} />} label="Registrado">
                    {formatDate(client.createdAt)}
                  </InfoRow>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
