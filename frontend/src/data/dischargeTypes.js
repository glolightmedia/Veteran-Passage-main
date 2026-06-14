// 8 DD-214 Discharge Characterizations
export const dischargeTypes = [
  { value: 'honorable', label: 'Honorable Discharge', tier: 'green', description: 'Full benefits eligibility' },
  { value: 'general', label: 'General (Under Honorable Conditions)', tier: 'green', description: 'Most benefits eligible' },
  { value: 'oth', label: 'Other Than Honorable (OTH)', tier: 'yellow', description: 'Limited benefits — case-by-case' },
  { value: 'entry-level', label: 'Entry Level Separation (Uncharacterized)', tier: 'yellow', description: 'Limited benefits — may qualify for some' },
  { value: 'bad-conduct-special', label: 'Bad Conduct (Special Court-Martial)', tier: 'blue', description: 'Restricted benefits — legal upgrade advised' },
  { value: 'bad-conduct-general', label: 'Bad Conduct (General Court-Martial)', tier: 'blue', description: 'Restricted benefits — legal upgrade advised' },
  { value: 'dishonorable', label: 'Dishonorable Discharge', tier: 'blue', description: 'Most benefits barred — legal upgrade recommended' },
  { value: 'dismissal', label: 'Dismissal (Officers)', tier: 'blue', description: 'Officer equivalent of dishonorable — legal counsel advised' }
];

// Branches of service
export const branches = [
  { value: 'army', label: 'Army' },
  { value: 'navy', label: 'Navy' },
  { value: 'air-force', label: 'Air Force' },
  { value: 'marines', label: 'Marine Corps' },
  { value: 'coast-guard', label: 'Coast Guard' },
  { value: 'space-force', label: 'Space Force' }
];

// Triage tier descriptions
export const triageTiers = {
  green: {
    label: 'Full Access',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    description: 'You have broad access to VA benefits and federal programs.'
  },
  yellow: {
    label: 'Case-by-Case',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    description: 'Benefits access varies. We\'ll help you find what you qualify for.'
  },
  blue: {
    label: 'Restricted — Upgrade Path Available',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    description: 'Most federal benefits are restricted, but discharge upgrades and non-VA resources are available.'
  }
};

export function getDischargeTier(dischargeValue) {
  const found = dischargeTypes.find(d => d.value === dischargeValue);
  return found ? found.tier : 'green';
}

export function isKindlingMode(dischargeValue) {
  const kindlingDischarges = ['oth', 'bad-conduct-special', 'bad-conduct-general', 'dishonorable', 'dismissal', 'entry-level'];
  return kindlingDischarges.includes(dischargeValue);
}
