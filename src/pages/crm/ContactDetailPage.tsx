import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Activity, Contact, fetchContact, fetchContactActivities } from "@/api/crm";
import { cn } from "@/lib/utils";

const ContactDetailPage = () => {
  const { id } = useParams();
  const [contact, setContact] = useState<Contact | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([fetchContact(id), fetchContactActivities(id, 25)])
      .then(([contactResponse, activityResponse]) => {
        if (cancelled) return;
        setContact(contactResponse);
        setActivities(activityResponse);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message ?? "Kontakt konnte nicht geladen werden.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  const infoPairs = useMemo(
    () => [
      { label: "E-Mail", value: contact?.email, link: contact?.email ? `mailto:${contact.email}` : undefined },
      { label: "Telefon", value: contact?.phone, link: contact?.phone ? `tel:${contact.phone}` : undefined },
      { label: "Unternehmen", value: contact?.company },
      { label: "Position", value: contact?.position },
      { label: "Stadt", value: contact?.city },
      { label: "Quelle", value: contact?.source },
      {
        label: "Lifecycle Stage",
        value: contact?.lifecycle_stage ? contact.lifecycle_stage.toUpperCase() : undefined,
      },
    ],
    [contact]
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.4em] text-gray-500">CRM · Kontakt</p>
          <h1 className="text-3xl font-semibold text-white">{contact?.name ?? "Kontakt"}</h1>
          <p className="text-sm text-gray-400">
            {contact?.company ?? "Kein Unternehmen hinterlegt"}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            to="/crm/contacts"
            className="rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-white hover:border-white/40"
          >
            Zurück zur Liste
          </Link>
        </div>
      </div>

      {loading && (
        <div className="rounded-3xl border border-white/10 bg-black/30 p-6 text-center text-gray-400">
          Kontakt wird geladen …
        </div>
      )}

      {!loading && error && (
        <div className="rounded-3xl border border-rose-500/30 bg-rose-500/10 p-6 text-center text-rose-200">
          {error}
        </div>
      )}

      {!loading && contact && (
        <>
          <section className="grid gap-6 lg:grid-cols-3">
            <article className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/5 to-white/0 p-6 lg:col-span-2">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.4em] text-gray-500">Status</p>
                  <p className="mt-2 text-2xl font-semibold text-white capitalize">
                    {contact.status}
                  </p>
                </div>
                <span className="rounded-full bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-white/80">
                  {contact.preferred_channel}
                </span>
              </div>
              <div className="mt-6 grid gap-4 text-sm text-gray-300 md:grid-cols-2">
                {infoPairs.map((entry) => (
                  <div key={entry.label}>
                    <p className="text-xs uppercase tracking-[0.3em] text-gray-500">{entry.label}</p>
                    {entry.value ? (
                      entry.link ? (
                        <a href={entry.link} className="mt-1 block font-semibold text-white hover:text-salesflow-accent">
                          {entry.value}
                        </a>
                      ) : (
                        <p className="mt-1 font-semibold text-white">{entry.value}</p>
                      )
                    ) : (
                      <p className="mt-1 text-gray-500">—</p>
                    )}
                  </div>
                ))}
              </div>
              {contact.tags.length > 0 && (
                <div className="mt-6 flex flex-wrap gap-2">
                  {contact.tags.map((tag) => (
                    <span key={tag} className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-gray-300">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </article>

            <article className="rounded-3xl border border-white/10 bg-black/40 p-6">
              <p className="text-xs uppercase tracking-[0.4em] text-gray-500">
                Follow-up
              </p>
              <p className="mt-3 text-sm text-gray-400">
                Nächster Schritt
              </p>
              <p className="mt-1 text-xl font-semibold text-white">
                {contact.next_followup_at
                  ? new Date(contact.next_followup_at).toLocaleString("de-AT", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "Noch nichts geplant"}
              </p>
              <div className="mt-6 text-sm text-gray-400">
                <p className="font-semibold text-white">Notizen</p>
                <p className="mt-2 whitespace-pre-line">
                  {contact.notes || "Keine Notizen hinterlegt."}
                </p>
              </div>
            </article>
          </section>

          <section className="rounded-3xl border border-white/10 bg-black/40 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-gray-500">Timeline</p>
                <h2 className="text-xl font-semibold text-white">Aktivitäten</h2>
              </div>
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white">
                {activities.length} Einträge
              </span>
            </div>

            <ul className="mt-6 space-y-5">
              {activities.length === 0 && (
                <li className="rounded-2xl border border-white/5 bg-black/30 p-4 text-center text-sm text-gray-500">
                  Noch keine Aktivitäten erfasst.
                </li>
              )}
              {activities.map((activity) => (
                <li
                  key={activity.id}
                  className="relative rounded-2xl border border-white/5 bg-black/30 p-4"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-white capitalize">
                      {activity.type.replace("_", " ")}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(activity.occurred_at).toLocaleString("de-AT", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  {activity.subject && (
                    <p className="mt-1 text-sm text-gray-300">{activity.subject}</p>
                  )}
                  {activity.content && (
                    <p className="mt-2 whitespace-pre-line text-sm text-gray-400">
                      {activity.content}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
};

export default ContactDetailPage;

