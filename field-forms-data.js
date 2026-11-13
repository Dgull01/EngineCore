const required = { required: true };

const select = (id, label, options, attributes = {}) => ({
  id, label, type: 'select', options, ...attributes,
});

const when = (field, ...values) => ({ when: { field, values } });
const count = (id, label) => ({ id, label, type: 'count' });
const reading = (id, label, unit, attributes = {}) => ({
  id, label, type: 'number', unit, ...attributes,
});

const yesNo = ['Yes', 'No', 'N/A'];
const alarmVisitTypes = ['Annual', 'Other periodic', 'Acceptance', 'Reacceptance', 'Service or retest', 'Other'];
const signalPaths = ['Cellular', 'IP', 'Radio', 'Telephone', 'Multiple paths', 'Local only', 'Other'];
const deviceTypes = [
  'Control panel', 'Zones', 'Pull stations', 'Audible/visible appliances', 'Visible-only appliances',
  'Heat detectors', 'Smoke detectors', 'Duct detectors', 'Remote annunciators', 'Trouble devices',
  'Waterflow devices', 'Supervisory devices', 'Door holders', 'Fan shutdown', 'City connection',
  'Battery chargers', 'Batteries',
];

const serviceStates = ['Restored to normal', 'Partially in service', 'Out of service', 'Not verified'];
const deviceResults = ['OK', 'Deficiency', 'Not tested', 'N/A'];
const visualResults = ['Satisfactory', 'Deficiency', 'Not inspected', 'N/A'];
const signalResults = ['Received', 'Not received', 'Not tested', 'N/A'];

const property = { id: 'property', label: 'Property or site name', ...required };
const address = { id: 'address', label: 'Street address', ...required };
const locality = { id: 'locality', label: 'City, state, ZIP' };
const sitePhone = { id: 'site-phone', label: 'Site phone', type: 'tel' };
const technician = { id: 'technician', label: 'Technician name', ...required };
const panelFields = [
  { id: 'manufacturer', label: 'Control panel manufacturer' },
  { id: 'model', label: 'Panel model' },
  { id: 'panel-location', label: 'Panel location' },
];

const restoration = [
  select('service-state', 'System status at closeout', serviceStates, required),
  { id: 'restored-date', label: 'Restored date', type: 'date', ...when('service-state', 'Restored to normal') },
  { id: 'restored-time', label: 'Restored time', type: 'time', ...when('service-state', 'Restored to normal') },
  { id: 'unrestored', label: 'Remaining impairment or reason status is unverified', type: 'textarea',
    ...when('service-state', 'Partially in service', 'Out of service', 'Not verified') },
];

const countFields = [
  count('installed', 'Installed'),
  count('tested', 'Tested'),
  select('status', 'Result', ['OK', 'Deficiency', 'Partially tested', 'Not tested', 'N/A']),
  { id: 'notes', label: 'Finding or reason', ...when('status', 'Deficiency', 'Partially tested', 'Not tested') },
];

const quickAlarm = {
  title: 'Fire Alarm Quick Fill',
  subtitle: 'Record device totals, signal checks and system closeout.',
  sections: [
    {
      id: 'visit', title: 'Site and visit', fields: [
        property, address, locality, sitePhone,
        { id: 'inspection-date', label: 'Inspection date', type: 'date', ...required },
        select('visit-type', 'Test type', alarmVisitTypes, required),
        { id: 'visit-detail', label: 'Describe the visit type', ...when('visit-type', 'Other periodic', 'Other') },
        technician,
      ],
    },
    {
      id: 'panel', title: 'Panel and monitoring', fields: [
        ...panelFields,
        { id: 'fire-department', label: 'Fire department or jurisdiction' },
        { id: 'monitoring-company', label: 'Monitoring company' },
        { id: 'monitoring-phone', label: 'Monitoring phone', type: 'tel' },
        { id: 'account', label: 'Monitoring account or position number' },
        { id: 'circuit', label: 'Panel circuit ID' },
        select('path', 'Signal transmission', signalPaths),
        { id: 'path-detail', label: 'Describe transmission path', ...when('path', 'Other', 'Multiple paths') },
      ],
    },
    {
      id: 'devices', title: 'Device counts',
      hint: 'Enter 0 when none are installed. Leave unchecked items blank.',
      rows: { labels: deviceTypes, fields: countFields },
      repeat: { label: 'device type', fields: [{ id: 'type', label: 'Device type' }, ...countFields] },
    },
    {
      id: 'signals', title: 'Signals received', rows: {
        labels: ['Trouble', 'Supervisory', 'Alarm', 'Alarm override'],
        fields: [select('status', 'Result', signalResults)],
      },
    },
    {
      id: 'batteries', title: 'Battery readings',
      fields: [
        select('type', 'Battery type', ['Sealed lead-acid', 'Other', 'N/A']),
        { id: 'type-detail', label: 'Battery type or model', ...when('type', 'Other') },
        { id: 'marked-date', label: 'Date marked on batteries', type: 'date' },
        reading('nominal-voltage', 'Nominal voltage per battery', 'V'),
        reading('capacity', 'Rated capacity per battery', 'Ah'),
        reading('bank-voltage', 'Battery bank voltage', 'V'),
        reading('load-voltage', 'Battery bank voltage under load', 'V'),
      ],
      repeat: { label: 'battery reading', fields: [
        { id: 'battery-id', label: 'Battery or bank ID' }, reading('voltage', 'Measured voltage', 'V'),
      ] },
    },
    {
      id: 'closeout', title: 'Findings and closeout', fields: [
        select('cleaning', 'Smoke detectors need cleaning', yesNo),
        select('repairs', 'Repairs required', yesNo),
        select('authorized', 'Repairs authorized', yesNo, when('repairs', 'Yes')),
        select('completed', 'Repairs completed', ['Yes', 'Partially', 'No'], when('repairs', 'Yes')),
        { id: 'repair-order', label: 'Repair work order reference', ...when('repairs', 'Yes') },
        { id: 'remarks', label: 'Findings, repairs or follow-up', type: 'textarea' },
        ...restoration,
        { id: 'technician-acknowledgment', label: 'Technician acknowledgment (typed name)' },
        { id: 'owner-acknowledgment', label: 'Site representative acknowledgment (typed name)' },
      ],
    },
  ],
};

const notificationRows = {
  labels: ['Monitoring company', 'Building management', 'Occupants', 'AHJ', 'Other recipient'],
  fields: [
    select('status', 'Notice', ['Notified', 'Attempted', 'Not notified', 'N/A']),
    { id: 'contact', label: 'Contact or method', ...when('status', 'Notified', 'Attempted') },
    { id: 'date', label: 'Date', type: 'date', ...when('status', 'Notified', 'Attempted') },
    { id: 'time', label: 'Time', type: 'time', ...when('status', 'Notified', 'Attempted') },
    { id: 'notes', label: 'Reason or follow-up', ...when('status', 'Attempted', 'Not notified') },
  ],
};

const testRows = [
  select('visual', 'Visual inspection', visualResults),
  select('status', 'Functional result', deviceResults),
  select('operation', 'Operation', ['Actual', 'Simulated'], when('status', 'OK', 'Deficiency')),
  { id: 'notes', label: 'Measurements, limits, findings or test details', type: 'textarea' },
];

const alarmNfpa = {
  title: 'Fire Alarm NFPA 72 Record',
  subtitle: 'Draft inspection and testing record for review against the adopted edition and local requirements.',
  sections: [
    {
      id: 'scope', title: 'Property and inspection scope', fields: [
        property, address, locality, sitePhone,
        { id: 'occupancy', label: 'Property use or description' },
        { id: 'site-rep', label: 'Owner or site representative' },
        { id: 'site-contact', label: 'Representative contact details' },
        { id: 'ahj', label: 'Authority having jurisdiction', ...required },
        select('edition', 'Adopted NFPA 72 edition', ['2025', '2022', '2019', '2016', '2013', 'Other', 'Unverified'], required),
        { id: 'edition-detail', label: 'Edition year', ...when('edition', 'Other') },
        select('visit-type', 'Test type', alarmVisitTypes, required),
        { id: 'scope-details', label: 'Scope, exclusions and test plan reference', type: 'textarea' },
        { id: 'start-date', label: 'Start date', type: 'date', ...required },
        { id: 'start-time', label: 'Start time', type: 'time' },
        { id: 'finish-date', label: 'Completion date', type: 'date' },
        { id: 'finish-time', label: 'Completion time', type: 'time' },
        { id: 'records-location', label: 'Location of records and site-specific software' },
        { id: 'supplements', label: 'Supplemental records or attachments reference' },
      ],
    },
    {
      id: 'organizations', title: 'Testing and monitoring organizations', fields: [
        { id: 'testing-company', label: 'Testing organization', ...required },
        { id: 'testing-address', label: 'Testing organization address' },
        { id: 'testing-contact', label: 'Testing organization phone, email or fax' },
        technician,
        { id: 'qualification', label: 'Technician qualifications or credential' },
        { id: 'monitoring-company', label: 'Monitoring organization' },
        { id: 'monitoring-address', label: 'Monitoring organization address' },
        { id: 'monitoring-contact', label: 'Monitoring contact details' },
        { id: 'monitoring-account', label: 'Monitoring account or position number' },
        { id: 'line-one', label: 'Phone line 1', type: 'tel' },
        { id: 'line-two', label: 'Phone line 2', type: 'tel' },
        select('path', 'Signal transmission', signalPaths),
        { id: 'path-detail', label: 'Describe transmission paths', ...when('path', 'Other', 'Multiple paths') },
        { id: 'retransmission', label: 'Alarm retransmission recipient' },
        { id: 'retransmission-phone', label: 'Retransmission recipient phone', type: 'tel' },
      ],
    },
    {
      id: 'before-notices', title: 'Before-test notices', rows: notificationRows,
    },
    {
      id: 'equipment', title: 'Control panel and power', fields: [
        ...panelFields,
        { id: 'firmware', label: 'Software or firmware revision' },
        reading('main-voltage', 'Primary supply nominal voltage', 'V'),
        reading('main-current', 'Primary supply rating', 'A'),
        { id: 'supply', label: 'Primary supply and overcurrent protection' },
        reading('overcurrent', 'Overcurrent protection rating', 'A'),
        { id: 'disconnect', label: 'Disconnect means and location' },
        select('secondary', 'Secondary power type', ['Battery', 'Generator', 'Battery and generator', 'Other', 'N/A']),
        { id: 'secondary-location', label: 'Secondary power location' },
        { id: 'battery-type', label: 'Battery type or model' },
        { id: 'battery-date', label: 'Battery manufacture date', type: 'date' },
        reading('battery-capacity', 'Calculated battery capacity', 'Ah'),
        reading('standby', 'Calculated standby duration', 'h'),
        reading('alarm-duration', 'Calculated alarm duration', 'min'),
      ],
      repeat: { label: 'battery or bank reading', fields: [
        { id: 'battery-id', label: 'Battery or bank ID' },
        reading('voltage', 'Measured voltage', 'V'),
        reading('load-voltage', 'Measured voltage under load', 'V'),
        { id: 'method', label: 'Test method or reading context' },
      ] },
    },
    {
      id: 'control-tests', title: 'Control unit and secondary power checks', rows: {
        labels: [
          'Control unit', 'Indicators and display', 'Fuses', 'Trouble signals', 'Disconnect switches',
          'Ground-fault monitoring', 'Supervision', 'Local annunciator', 'Remote annunciators', 'Remote power panels',
          'Battery condition', 'Load voltage', 'Discharge test', 'Charger test', 'Remote panel batteries', 'Battery date marking',
        ],
        fields: testRows,
      },
    },
    {
      id: 'individual-tests', title: 'Device, appliance and interface results',
      hint: 'Add the applicable individual test records or identify the supplemental record with those results.',
      repeat: { label: 'test record', fields: [
        select('category', 'Category', ['Initiating device', 'Notification appliance', 'Interface', 'Emergency communications', 'Mass notification', 'Other']),
        { id: 'type', label: 'Device, appliance or function type' },
        { id: 'device-id', label: 'Device ID, address or circuit' },
        { id: 'location', label: 'Physical location' },
        ...testRows,
      ] },
    },
    {
      id: 'monitoring-tests', title: 'Monitoring and signal restoration',
      hint: 'Add an entry for each applicable signal and restoration at each receiver.',
      repeat: { label: 'signal or restoration', fields: [
        select('receiver', 'Receiver', ['Supervising station', 'Public emergency alarm reporting system', 'Other']),
        select('signal', 'Signal', ['Alarm', 'Alarm restoration', 'Trouble', 'Trouble restoration', 'Supervisory', 'Supervisory restoration', 'Other']),
        select('status', 'Result', signalResults),
        { id: 'date', label: 'Date', type: 'date', ...when('status', 'Received', 'Not received') },
        { id: 'time', label: 'Time', type: 'time', ...when('status', 'Received', 'Not received') },
        { id: 'notes', label: 'Receiver contact or comments' },
      ] },
    },
    {
      id: 'after-notices', title: 'Completion notices', rows: notificationRows,
    },
    {
      id: 'findings', title: 'Deficiencies and impairments', repeat: { label: 'finding', fields: [
        select('status', 'Disposition', ['Corrected', 'Open deficiency', 'Impairment', 'Deferred or inaccessible']),
        { id: 'location', label: 'Affected device, function or location' },
        { id: 'finding', label: 'Finding and corrective action', type: 'textarea' },
        { id: 'notified', label: 'Person notified and date/time', ...when('status', 'Open deficiency', 'Impairment', 'Deferred or inaccessible') },
        { id: 'follow-up', label: 'Work order, interim measures or follow-up', type: 'textarea',
          ...when('status', 'Open deficiency', 'Impairment', 'Deferred or inaccessible') },
      ] },
    },
    {
      id: 'closeout', title: 'Restoration and acknowledgment', fields: [
        ...restoration,
        { id: 'technician-acknowledgment', label: 'Technician acknowledgment (typed name)' },
        { id: 'technician-title', label: 'Technician title' },
        { id: 'technician-date', label: 'Technician acknowledgment date', type: 'date' },
        { id: 'owner-acknowledgment', label: 'Owner or representative acknowledgment (typed name)' },
        { id: 'owner-title', label: 'Owner or representative title and organization' },
        { id: 'owner-phone', label: 'Owner or representative phone', type: 'tel' },
        { id: 'owner-date', label: 'Owner or representative acknowledgment date', type: 'date' },
      ],
    },
  ],
  sources: [
    ['NFPA 72 National Fire Alarm and Signaling Code', 'https://www.nfpa.org/codes-and-standards/nfpa-10-standard-development/72'],
    ['NFPA 72 sample record reference', 'https://www.nfpa.org/product/nfpa-72-forms/p0072form'],
  ],
};

const pmResults = ['OK', 'Serviced', 'Issue', 'Deferred', 'N/A'];
const exception = (label) => ({ id: 'notes', label, ...when('status', 'Issue', 'Deferred') });

const hvacPm = {
  title: 'Rooftop HVAC Preventive Maintenance',
  subtitle: 'Record the condition, work performed and next steps for one rooftop unit.',
  sections: [
    {
      id: 'visit', title: 'Site and roof access', fields: [
        property, address, technician,
        { id: 'service-date', label: 'Service date', type: 'date', ...required },
        select('visit-type', 'Visit type', ['Routine PM', 'Cooling PM', 'Heating PM', 'Follow-up', 'Other'], required),
        { id: 'work-order', label: 'Work order number' },
        select('access', 'Roof access', ['Accessed', 'Limited access', 'Deferred: weather', 'Deferred: unsafe access', 'Deferred: other']),
        { id: 'access-detail', label: 'Access limitation or reason for deferral',
          ...when('access', 'Limited access', 'Deferred: weather', 'Deferred: unsafe access', 'Deferred: other') },
      ],
    },
    {
      id: 'unit', title: 'Unit identification', fields: [
        { id: 'unit-id', label: 'Unit tag', ...required },
        { id: 'unit-location', label: 'Roof location or area served' },
        { id: 'make', label: 'Manufacturer' },
        { id: 'model', label: 'Model number' },
        { id: 'serial', label: 'Serial number' },
        select('unit-type', 'Unit type', ['Gas heat / electric cool', 'Electric heat / electric cool', 'Heat pump', 'Cooling only', 'Other', 'Unknown']),
        { id: 'manual', label: 'Unit IOM document and revision' },
      ],
    },
    {
      id: 'checks', title: 'Routine maintenance',
      hint: 'Use the unit IOM and site maintenance plan for applicable checks and intervals.',
      rows: {
        labels: [
          'Cabinet, panels and curb', 'Return-air filters', 'Outdoor air intake and screens', 'Economizer or outside air damper',
          'Condenser coil and outdoor fan', 'Evaporator coil', 'Condensate pan, drain and trap',
          'Supply fan and blower', 'Belts and pulleys', 'Electrical connections and controls', 'Thermostat or unit controller',
          'Heating components and vent (where equipped)',
        ],
        fields: [select('status', 'Result', pmResults), exception('Issue or reason for deferral')],
      },
      repeat: { label: 'filter size', fields: [
        { id: 'size', label: 'Filter size', placeholder: '20 × 25 × 2' },
        count('quantity', 'Quantity'),
        select('action', 'Filter action', ['Inspected', 'Cleaned', 'Replaced', 'Deferred']),
      ] },
    },
    {
      id: 'operation', title: 'Operating checks and readings', fields: [
        select('mode', 'Modes checked', ['Cooling', 'Heating', 'Heating and cooling', 'Fan only', 'Not operated']),
        { id: 'no-test-reason', label: 'Reason unit was not operated', ...when('mode', 'Not operated') },
        select('cooling-result', 'Cooling operation', pmResults, when('mode', 'Cooling', 'Heating and cooling')),
        select('heating-result', 'Heating operation', pmResults, when('mode', 'Heating', 'Heating and cooling')),
        select('fan-result', 'Fan operation', pmResults, when('mode', 'Fan only')),
        { id: 'cooling-note', label: 'Cooling issue or reason for deferral', ...when('cooling-result', 'Issue', 'Deferred') },
        { id: 'heating-note', label: 'Heating issue or reason for deferral', ...when('heating-result', 'Issue', 'Deferred') },
        { id: 'fan-note', label: 'Fan issue or reason for deferral', ...when('fan-result', 'Issue', 'Deferred') },
      ],
      repeat: { label: 'reading', fields: [
        select('mode', 'Operating mode', ['Cooling', 'Heating', 'Fan only', 'Other']),
        select('type', 'Reading', ['Outdoor air temperature', 'Return air temperature', 'Supply air temperature', 'Heating temperature rise', 'Blower current', 'Line voltage', 'Other']),
        { id: 'type-detail', label: 'Reading name', ...when('type', 'Other') },
        { id: 'value', label: 'Measured value', type: 'number' },
        select('unit', 'Unit', ['°F', '°C', 'A', 'V', 'in. w.c.', 'psig', 'Other']),
        { id: 'unit-detail', label: 'Unit of measure', ...when('unit', 'Other') },
      ] },
    },
    {
      id: 'closeout', title: 'Unit status and follow-up', fields: [
        select('unit-state', 'Unit left', ['Operating normally', 'Operating with issue', 'Off or isolated', 'Not verified'], required),
        select('follow-up', 'Follow-up needed', yesNo),
        { id: 'findings', label: 'Work performed, issues or follow-up', type: 'textarea' },
        { id: 'contact', label: 'Site contact notified', ...when('follow-up', 'Yes') },
        { id: 'technician-acknowledgment', label: 'Technician acknowledgment (typed name)' },
      ],
    },
  ],
  sources: [
    ['ANSI/ASHRAE/ACCA Standard 180', 'https://www.ashrae.org/technical-resources/bookstore/standards-180-and-211'],
    ['Carrier 48GC service and maintenance manual example', 'https://www.shareddocs.com/hvac/docs/1005/Public/0D/48GC-4-6-03SM.pdf#page=3'],
  ],
};

export const forms = {
  'alarm-quick': quickAlarm,
  'alarm-nfpa': alarmNfpa,
  'hvac-pm': hvacPm,
};
