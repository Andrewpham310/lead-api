export default function StatsCards({ stats }) {
  const cards = [
    { label: 'Total Leads', value: stats.totalLeads, tone: 'blue' },
    { label: 'New', value: stats.newLeads, tone: 'sky' },
    { label: 'Contacted', value: stats.contactedLeads, tone: 'amber' },
    { label: 'Booked', value: stats.bookedLeads, tone: 'green' },
    { label: 'Lost', value: stats.lostLeads, tone: 'rose' },
  ];

  return (
    <div className="stats-grid">
      {cards.map((card) => (
        <article key={card.label} className={`stat-card stat-${card.tone}`}>
          <p>{card.label}</p>
          <strong>{card.value}</strong>
        </article>
      ))}
    </div>
  );
}
