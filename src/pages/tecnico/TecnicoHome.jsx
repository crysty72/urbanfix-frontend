
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../../context/useAuth";
import {
  getAvailableServiceRequests,
  acceptServiceRequest,
} from "../../services/serviceRequestService";

const nombresProfesiones = {
  ELECTRICISTA: "Electricidad",
  PLOMERO: "Plomería",
  GASISTA: "Gas",
  TECNICO_AC: "Refrigeración",
  CERRAJERO: "Cerrajería",
  ALBANIL: "Albañilería",
};

const formatearFecha = (fecha) => {
  if (!fecha || Number.isNaN(new Date(fecha).getTime())) {
    return "Sin fecha";
  }

  return new Date(fecha).toLocaleDateString("es-AR");
};

export default function TecnicoHome() {
  const { user, logout } = useAuth();

  const [solicitudes, setSolicitudes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] = useState(false);
  const [aceptandoId, setAceptandoId] = useState(null);

  const [error, setError] = useState("");
  const [errorAccion, setErrorAccion] = useState("");
  const [mensajeExito, setMensajeExito] = useState("");

  const [solicitudDetalle, setSolicitudDetalle] = useState(null);
  const [filtroOficio, setFiltroOficio] = useState("TODOS");

  const dialogRef = useRef(null);

  const nombre = user?.name || "Técnico";

  const profesionesDisponibles = [
    ...new Set(
      solicitudes
        .map((solicitud) => solicitud.requiredProfession)
        .filter(Boolean)
    ),
  ];

  const solicitudesFiltradas =
    filtroOficio === "TODOS"
      ? solicitudes
      : solicitudes.filter(
          (solicitud) =>
            solicitud.requiredProfession === filtroOficio
        );

  // Obtener solicitudes disponibles desde Backend
  const fetchSolicitudes = useCallback(async () => {
    try {
      const respuesta = await getAvailableServiceRequests();

      setSolicitudes(
        Array.isArray(respuesta?.data) ? respuesta.data : []
      );

      setError("");
    } catch (err) {
      const mensaje = err.response?.data?.message;

      setSolicitudes([]);
      setError(
        typeof mensaje === "string"
          ? mensaje
          : "No se pudieron cargar las solicitudes."
      );
    } finally {
      setCargando(false);
      setActualizando(false);
    }
  }, []);

  // Carga inicial
  useEffect(() => {
    const cargarSolicitudes = async () => {
      await fetchSolicitudes();
    };

    void cargarSolicitudes();
  }, [fetchSolicitudes]);


  // Actualización manual
  const handleActualizar = async () => {
    if (cargando || actualizando || aceptandoId !== null) {
      return;
    }

    setActualizando(true);
    setErrorAccion("");
    setMensajeExito("");

    await fetchSolicitudes();
  };

  // Aceptar solicitud
  const handleAceptar = async (solicitud) => {
    if (!solicitud?.id || aceptandoId !== null) {
      return;
    }

    const confirmado = window.confirm(
      `¿Querés aceptar la solicitud "${solicitud.title}"?`
    );

    if (!confirmado) {
      return;
    }

    setAceptandoId(solicitud.id);
    setErrorAccion("");
    setMensajeExito("");

    try {
      await acceptServiceRequest(solicitud.id);

      setMensajeExito(
        "Solicitud aceptada correctamente. El trabajo ya no aparecerá entre las solicitudes disponibles."
      );

      // Cerrar los detalles si estaban abiertos
      if (dialogRef.current?.open) {
        dialogRef.current.close();
      }
    } catch (err) {
      const mensaje = err.response?.data?.message;

      setErrorAccion(
        Array.isArray(mensaje)
          ? mensaje.join(", ")
          : typeof mensaje === "string"
            ? mensaje
            : "No se pudo aceptar la solicitud. Es posible que otro técnico la haya aceptado primero."
      );
    } finally {
      // Actualizar incluso si Backend rechazó la operación
      await fetchSolicitudes();
      setAceptandoId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F8FE]">
      {/* HEADER */}
      <header className="flex items-center justify-between gap-4 bg-[#011659] px-4 py-5 text-white sm:px-6">
        <h1 className="text-2xl font-bold">
          Urban<span className="text-[#FF5F15]">Fix</span>
        </h1>

        <button
          type="button"
          onClick={logout}
          className="rounded-lg bg-[#FF5F15] px-4 py-2 text-sm font-semibold transition hover:bg-orange-600"
        >
          Cerrar sesión
        </button>
      </header>

      {/* CONTENIDO */}
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <h2 className="text-2xl font-bold text-[#011659] sm:text-3xl">
          ¡Bienvenido, {nombre}!
        </h2>

        <p className="mt-2 text-gray-600">
          Gestioná las solicitudes disponibles para tu profesión.
        </p>

        {/* PANEL DE SOLICITUDES */}
        <section className="mt-8 rounded-2xl bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold text-[#011659]">
                Solicitudes disponibles
              </h3>

              {!cargando && !error && (
                <p className="mt-1 text-sm text-gray-500">
                  {solicitudes.length}{" "}
                  {solicitudes.length === 1
                    ? "solicitud disponible"
                    : "solicitudes disponibles"}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={handleActualizar}
              disabled={
                cargando ||
                actualizando ||
                aceptandoId !== null
              }
              className="rounded-lg bg-[#011659] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {cargando || actualizando
                ? "Actualizando..."
                : "Actualizar"}
            </button>
          </div>

          {/* FILTRO POR OFICIO */}
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <label
              htmlFor="filtro-oficio"
              className="text-sm font-semibold text-[#011659]"
            >
              Oficio:
            </label>

            <select
              id="filtro-oficio"
              value={filtroOficio}
              onChange={(event) =>
                setFiltroOficio(event.target.value)
              }
              className="min-h-11 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-[#011659]"
            >
              <option value="TODOS">
                Todos los oficios
              </option>

              {profesionesDisponibles.map((profesion) => (
                <option key={profesion} value={profesion}>
                  {nombresProfesiones[profesion] || profesion}
                </option>
              ))}
            </select>
          </div>

          {/* MENSAJE DE ÉXITO */}
          {mensajeExito && (
            <p
              role="status"
              className="mt-5 rounded-lg bg-green-50 p-4 text-sm font-medium text-green-800"
            >
              {mensajeExito}
            </p>
          )}

          {/* ERROR AL ACEPTAR */}
          {errorAccion && (
            <p
              role="alert"
              className="mt-5 rounded-lg bg-red-50 p-4 text-sm text-red-700"
            >
              {errorAccion}
            </p>
          )}

          {/* CARGANDO */}
          {cargando && (
            <p role="status" className="mt-6 text-gray-600">
              Cargando solicitudes...
            </p>
          )}

          {/* ERROR DE LISTADO */}
          {error && (
            <p
              role="alert"
              className="mt-6 rounded-lg bg-red-50 p-4 text-sm text-red-700"
            >
              {error}
            </p>
          )}

          {/* SIN SOLICITUDES */}
          {!cargando &&
            !error &&
            solicitudesFiltradas.length === 0 && (
              <div className="mt-6 rounded-xl border border-dashed border-gray-300 p-8 text-center">
                <p className="font-semibold text-[#011659]">
                  {filtroOficio === "TODOS"
                    ? "No hay solicitudes disponibles"
                    : "No se encontraron solicitudes para este oficio"}
                </p>

                <p className="mt-2 text-sm text-gray-500">
                  Volvé a consultar más tarde para encontrar
                  nuevos trabajos.
                </p>
              </div>
            )}

          {/* LISTADO */}
          {!cargando &&
            !error &&
            solicitudesFiltradas.length > 0 && (
              <div className="mt-6 grid gap-5 md:grid-cols-2">
                {solicitudesFiltradas.map((solicitud) => (
                  <article
                    key={solicitud.id}
                    className="min-w-0 rounded-2xl border border-gray-200 bg-white p-5 transition hover:shadow-md"
                  >
                    {/* TÍTULO Y ETIQUETAS */}
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <h4 className="min-w-0 flex-[1_1_160px] font-bold text-[#011659] [overflow-wrap:anywhere]">
                        {solicitud.title}
                      </h4>

                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-blue-300 bg-blue-50 px-3 py-1 text-xs font-semibold text-[#011659]">
                          {nombresProfesiones[
                            solicitud.requiredProfession
                          ] ||
                            solicitud.requiredProfession ||
                            "Sin oficio"}
                        </span>

                        <span className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-900">
                          {solicitud.status === "PENDIENTE"
                            ? "Pendiente"
                            : solicitud.status || "Sin estado"}
                        </span>
                      </div>
                    </div>

                    {/* DESCRIPCIÓN */}
                    <p className="mt-4 text-sm leading-6 text-gray-700 [overflow-wrap:anywhere]">
                      {solicitud.description}
                    </p>

                    {/* DATOS */}
                    <div className="mt-5 space-y-2 border-t border-gray-100 pt-4 text-sm text-gray-600">
                      <p className="[overflow-wrap:anywhere]">
                        <strong className="text-[#011659]">
                          Dirección:
                        </strong>{" "}
                        {solicitud.address || "No informada"}
                      </p>

                      <p className="text-xs text-gray-500">
                        Fecha:{" "}
                        {formatearFecha(solicitud.createdAt)}
                      </p>
                    </div>

                    {/* ACCIONES */}
                    <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                      <button
                        type="button"
                        onClick={() => {
                          setSolicitudDetalle(solicitud);
                          dialogRef.current?.showModal();
                        }}
                        className="flex-1 rounded-lg border border-[#011659] px-4 py-3 font-semibold text-[#011659] transition hover:bg-blue-50"
                      >
                        Ver detalles
                      </button>

                      {solicitud.status === "PENDIENTE" && (
                        <button
                          type="button"
                          onClick={() =>
                            void handleAceptar(solicitud)
                          }
                          disabled={aceptandoId !== null}
                          className="flex-1 rounded-lg bg-[#FF5F15] px-4 py-3 font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {aceptandoId === solicitud.id
                            ? "Aceptando..."
                            : "Aceptar solicitud"}
                        </button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
        </section>

        {/* VENTANA DE DETALLES */}
        <dialog
          ref={dialogRef}
          onClose={() => setSolicitudDetalle(null)}
          aria-labelledby="titulo-detalle"
          className="m-auto max-h-[85vh] w-[92%] max-w-xl overflow-y-auto rounded-2xl bg-white p-6 text-gray-700 shadow-xl backdrop:bg-black/50"
        >
          {solicitudDetalle && (
            <div className="space-y-4">
              <h3
                id="titulo-detalle"
                className="text-2xl font-bold text-[#011659] [overflow-wrap:anywhere]"
              >
                {solicitudDetalle.title}
              </h3>

              <p className="whitespace-pre-wrap [overflow-wrap:anywhere]">
                {solicitudDetalle.description}
              </p>

              <p className="[overflow-wrap:anywhere]">
                <strong>Oficio:</strong>{" "}
                {nombresProfesiones[
                  solicitudDetalle.requiredProfession
                ] ||
                  solicitudDetalle.requiredProfession ||
                  "No informado"}
              </p>

              <p className="[overflow-wrap:anywhere]">
                <strong>Dirección:</strong>{" "}
                {solicitudDetalle.address || "No informada"}
              </p>

              <p>
                <strong>Estado:</strong>{" "}
                {solicitudDetalle.status || "Sin estado"}
              </p>

              <p>
                <strong>Fecha:</strong>{" "}
                {formatearFecha(solicitudDetalle.createdAt)}
              </p>

              <button
                type="button"
                onClick={() => dialogRef.current?.close()}
                className="w-full rounded-lg bg-[#FF5F15] px-4 py-3 font-semibold text-white transition hover:bg-orange-600"
              >
                Cerrar
              </button>
            </div>
          )}
        </dialog>
      </main>
    </div>
  );
}
