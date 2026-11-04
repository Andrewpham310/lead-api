export default function BusinessProfileForm({
  profile,
  onChange,
  onSubmit,
  submitting,
  isEditing,
}) {
  const updateField = (field, value) => {
    onChange({ ...profile, [field]: value });
  };

  const updateHour = (day, patch) => {
    onChange({
      ...profile,
      businessHours: profile.businessHours.map((period) => {
        if (period.day !== day) return period;

        const next = { ...period, ...patch };
        if (next.closed) {
          next.open = '';
          next.close = '';
        }

        return next;
      }),
    });
  };

  const updateService = (clientKey, patch) => {
    onChange({
      ...profile,
      serviceCatalog: profile.serviceCatalog.map((service) =>
        service.clientKey === clientKey ? { ...service, ...patch } : service
      ),
    });
  };

  const addService = () => {
    onChange({
      ...profile,
      serviceCatalog: [
        ...profile.serviceCatalog,
        {
          clientKey: crypto.randomUUID(),
          name: '',
          price: '',
          description: '',
        },
      ],
    });
  };

  const removeService = (clientKey) => {
    onChange({
      ...profile,
      serviceCatalog: profile.serviceCatalog.filter((service) => service.clientKey !== clientKey),
    });
  };

  return (
    <form onSubmit={onSubmit} className="form">
      <fieldset className="form-section">
        <legend>Basics</legend>

        <label>
          Business name
          <input
            type="text"
            value={profile.businessName}
            onChange={(e) => updateField('businessName', e.target.value)}
            placeholder="Anna Nails"
            required
          />
        </label>

        <label>
          Industry
          <input
            type="text"
            value={profile.industry}
            onChange={(e) => updateField('industry', e.target.value)}
            placeholder="nail salon"
          />
        </label>
      </fieldset>

      <fieldset className="form-section">
        <legend>Contact</legend>

        <label>
          Business address
          <textarea
            className="textarea-compact"
            value={profile.address}
            onChange={(e) => updateField('address', e.target.value)}
            placeholder="123 Queen St W, Toronto, ON"
            rows={3}
          />
        </label>

        <label>
          Phone number
          <input
            type="tel"
            value={profile.phone}
            onChange={(e) => updateField('phone', e.target.value)}
            placeholder="(416) 555-0199"
          />
        </label>

        <label>
          Website
          <input
            type="text"
            value={profile.website}
            onChange={(e) => updateField('website', e.target.value)}
            placeholder="https://annanails.com"
            inputMode="url"
          />
        </label>
      </fieldset>

      <fieldset className="form-section">
        <legend>Business hours</legend>
        <p className="field-hint">Leave a day blank if you have not set hours yet.</p>

        <div className="hours-editor">
          {profile.businessHours.map((period) => (
            <div className="hours-row" key={period.day}>
              <span className="hours-day">{period.day}</span>
              <input
                type="time"
                aria-label={`${period.day} opening time`}
                value={period.open}
                onChange={(e) => updateHour(period.day, { open: e.target.value })}
                disabled={period.closed}
              />
              <input
                type="time"
                aria-label={`${period.day} closing time`}
                value={period.close}
                onChange={(e) => updateHour(period.day, { close: e.target.value })}
                disabled={period.closed}
              />
              <label className="hours-closed">
                <input
                  type="checkbox"
                  checked={period.closed}
                  onChange={(e) => updateHour(period.day, { closed: e.target.checked })}
                />
                Closed
              </label>
            </div>
          ))}
        </div>
      </fieldset>

      <fieldset className="form-section">
        <legend>Service catalog</legend>
        <p className="field-hint">List the services customers can ask about. Price is optional.</p>

        {profile.serviceCatalog.length > 0 && (
          <div className="service-list">
            {profile.serviceCatalog.map((service) => (
              <div className="service-card" key={service.clientKey}>
                <div className="service-card-row">
                  <label>
                    Service name
                    <input
                      type="text"
                      value={service.name}
                      onChange={(e) => updateService(service.clientKey, { name: e.target.value })}
                      placeholder="Manicure"
                    />
                  </label>
                  <label>
                    Price
                    <input
                      type="text"
                      value={service.price}
                      onChange={(e) => updateService(service.clientKey, { price: e.target.value })}
                      placeholder="$45"
                    />
                  </label>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => removeService(service.clientKey)}
                  >
                    Remove
                  </button>
                </div>
                <label>
                  Description
                  <input
                    type="text"
                    value={service.description}
                    onChange={(e) =>
                      updateService(service.clientKey, { description: e.target.value })
                    }
                    placeholder="Classic manicure"
                  />
                </label>
              </div>
            ))}
          </div>
        )}

        <button type="button" className="btn btn-secondary" onClick={addService}>
          Add service
        </button>
      </fieldset>

      <button type="submit" className="btn btn-primary" disabled={submitting}>
        {submitting ? 'Saving...' : isEditing ? 'Save changes' : 'Create business'}
      </button>
    </form>
  );
}
