const PagePlaceholder = ({
  title,
  tagline = "Demnächst verfügbar",
  description,
  highlights = [],
  action,
}) => {
  return (
    <div className="rounded-3xl border border-white/5 bg-gray-900/50 p-10 text-white shadow-2xl">
      {tagline && (
        <p className="text-xs uppercase tracking-[0.4em] text-gray-500">
          {tagline}
        </p>
      )}
      <h1 className="mt-4 text-3xl font-semibold text-white">{title}</h1>
      {description && (
        <p className="mt-4 text-base text-gray-400">
          {description}
        </p>
      )}
      {highlights.length > 0 && (
        <ul className="mt-6 space-y-3 text-sm text-gray-300">
          {highlights.map((item) => (
            <li
              key={item}
              className="rounded-2xl border border-white/5 bg-black/20 px-4 py-3"
            >
              {item}
            </li>
          ))}
        </ul>
      )}
      {action && (
        <div className="mt-8 inline-flex items-center gap-3 rounded-2xl border border-salesflow-accent/30 bg-salesflow-accent/10 px-4 py-3 text-sm text-salesflow-accent">
          {action}
        </div>
      )}
    </div>
  );
};

export default PagePlaceholder;
