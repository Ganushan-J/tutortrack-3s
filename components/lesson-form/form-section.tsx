export function FormSection({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  const headingId = `section-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
  return (
    <section aria-labelledby={headingId} className="rounded-xl border border-border bg-card">
      <div className="border-b border-border px-4 py-3.5 md:px-5">
        <h2 id={headingId} className="text-sm font-semibold">
          {title}
        </h2>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      <div className="px-4 py-5 md:px-5">{children}</div>
    </section>
  )
}
