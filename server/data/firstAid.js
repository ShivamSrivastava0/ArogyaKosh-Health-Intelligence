/** Home first-aid kit catalog (based on Indian Red Cross / St John guidance). */
export const FIRST_AID_ITEMS = [
  { key: 'bandages', name: 'Adhesive bandages (assorted)', essential: true, why: 'Small cuts and blisters', expires: false },
  { key: 'gauze', name: 'Sterile gauze pads', essential: true, why: 'Covering larger wounds', expires: true },
  { key: 'crepe', name: 'Crepe / elastic bandage', essential: true, why: 'Sprains and holding dressings', expires: false },
  { key: 'tape', name: 'Medical tape', essential: true, why: 'Securing dressings', expires: false },
  { key: 'antiseptic', name: 'Antiseptic liquid (e.g. povidone-iodine)', essential: true, why: 'Cleaning wounds', expires: true },
  { key: 'cotton', name: 'Cotton wool', essential: false, why: 'Cleaning and padding', expires: false },
  { key: 'thermometer', name: 'Digital thermometer', essential: true, why: 'Checking fever accurately', expires: false },
  { key: 'ors', name: 'ORS sachets', essential: true, why: 'Dehydration from diarrhoea / heat', expires: true },
  { key: 'paracetamol', name: 'Paracetamol tablets / syrup', essential: true, why: 'Fever and mild pain', expires: true },
  { key: 'antihistamine', name: 'Antihistamine (e.g. cetirizine)', essential: false, why: 'Mild allergic reactions', expires: true },
  { key: 'burn_gel', name: 'Burn gel / silver sulfadiazine', essential: false, why: 'Minor burns', expires: true },
  { key: 'gloves', name: 'Disposable gloves', essential: true, why: 'Hygiene while treating wounds', expires: false },
  { key: 'scissors', name: 'Blunt-tip scissors', essential: true, why: 'Cutting tape and dressings', expires: false },
  { key: 'tweezers', name: 'Tweezers', essential: false, why: 'Splinters and debris', expires: false },
  { key: 'cold_pack', name: 'Instant cold pack', essential: false, why: 'Swelling and sprains', expires: true },
  { key: 'bp_monitor', name: 'BP monitor', essential: false, why: 'Monitoring elders at home', expires: false },
  { key: 'glucometer', name: 'Glucometer + strips', essential: false, why: 'Diabetics in the family', expires: true },
  { key: 'pulse_ox', name: 'Pulse oximeter', essential: false, why: 'Checking oxygen levels', expires: false },
  { key: 'torch', name: 'Torch with spare batteries', essential: false, why: 'Power cuts / night emergencies', expires: false },
  { key: 'emergency_list', name: 'Printed emergency contact list', essential: true, why: 'When phones are unavailable', expires: false },
];

export const EMERGENCY_NUMBERS = [
  { label: 'National emergency', number: '112' },
  { label: 'Ambulance', number: '108' },
  { label: 'Police', number: '100' },
  { label: 'Fire', number: '101' },
  { label: 'Women helpline', number: '1091' },
  { label: 'Poison control (AIIMS)', number: '1800116117' },
];
