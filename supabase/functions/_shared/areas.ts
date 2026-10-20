// Bangalore areas the crawler can pin a job to when the listing names one.
// Coordinates are rough area centres, so these pins are marked location_precision = 'area'.

export interface Area {
  name: string;
  aliases: string[];
  latitude: number;
  longitude: number;
}

export const AREAS: Area[] = [
  { name: 'Koramangala', aliases: [], latitude: 12.9352, longitude: 77.6245 },
  { name: 'Indiranagar', aliases: ['indira nagar'], latitude: 12.9784, longitude: 77.6408 },
  { name: 'HSR Layout', aliases: ['hsr'], latitude: 12.9116, longitude: 77.6474 },
  { name: 'Whitefield', aliases: ['itpl', 'itpb'], latitude: 12.9698, longitude: 77.75 },
  { name: 'Electronic City', aliases: ['electronics city', 'e-city'], latitude: 12.8452, longitude: 77.6602 },
  { name: 'Marathahalli', aliases: [], latitude: 12.9569, longitude: 77.7011 },
  { name: 'Bellandur', aliases: ['ecospace', 'eco space'], latitude: 12.9304, longitude: 77.6784 },
  { name: 'Sarjapur Road', aliases: ['sarjapur', 'wipro corporate office'], latitude: 12.901, longitude: 77.686 },
  { name: 'MG Road', aliases: ['m.g. road', 'mahatma gandhi road', 'brigade road'], latitude: 12.9756, longitude: 77.6066 },
  { name: 'Richmond Road', aliases: ['richmond town'], latitude: 12.966, longitude: 77.604 },
  { name: 'Cunningham Road', aliases: ['vasanth nagar'], latitude: 12.987, longitude: 77.595 },
  { name: 'Jayanagar', aliases: [], latitude: 12.925, longitude: 77.5938 },
  { name: 'JP Nagar', aliases: ['j.p. nagar', 'jp nagar'], latitude: 12.9063, longitude: 77.5857 },
  { name: 'BTM Layout', aliases: ['btm'], latitude: 12.9166, longitude: 77.6101 },
  { name: 'Banashankari', aliases: [], latitude: 12.9255, longitude: 77.5468 },
  { name: 'Basavanagudi', aliases: [], latitude: 12.9406, longitude: 77.5738 },
  { name: 'Bannerghatta Road', aliases: ['bannerghatta'], latitude: 12.888, longitude: 77.597 },
  { name: 'Rajajinagar', aliases: [], latitude: 12.991, longitude: 77.5525 },
  { name: 'Malleshwaram', aliases: ['malleswaram'], latitude: 13.0035, longitude: 77.5647 },
  { name: 'Sadashivanagar', aliases: [], latitude: 13.0068, longitude: 77.5813 },
  { name: 'Yeshwanthpur', aliases: ['yeshwantpur'], latitude: 13.028, longitude: 77.54 },
  { name: 'Peenya', aliases: [], latitude: 13.0285, longitude: 77.5197 },
  { name: 'Vijayanagar', aliases: [], latitude: 12.9719, longitude: 77.53 },
  { name: 'Kengeri', aliases: [], latitude: 12.9077, longitude: 77.4829 },
  { name: 'Hebbal', aliases: [], latitude: 13.0358, longitude: 77.597 },
  { name: 'Manyata Tech Park', aliases: ['manyata', 'nagawara'], latitude: 13.0475, longitude: 77.621 },
  { name: 'RT Nagar', aliases: ['r.t. nagar'], latitude: 13.0206, longitude: 77.596 },
  { name: 'Yelahanka', aliases: [], latitude: 13.1007, longitude: 77.5963 },
  { name: 'Hennur', aliases: [], latitude: 13.04, longitude: 77.64 },
  { name: 'Kalyan Nagar', aliases: [], latitude: 13.028, longitude: 77.64 },
  { name: 'HBR Layout', aliases: [], latitude: 13.035, longitude: 77.632 },
  { name: 'Frazer Town', aliases: [], latitude: 12.998, longitude: 77.615 },
  { name: 'Ulsoor', aliases: ['halasuru'], latitude: 12.9817, longitude: 77.623 },
  { name: 'Domlur', aliases: ['embassy golf links', 'egl'], latitude: 12.961, longitude: 77.6387 },
  { name: 'Old Airport Road', aliases: ['hal airport road'], latitude: 12.96, longitude: 77.648 },
  { name: 'CV Raman Nagar', aliases: ['c.v. raman nagar', 'bagmane tech park', 'bagmane'], latitude: 12.985, longitude: 77.663 },
  { name: 'KR Puram', aliases: ['k.r. puram', 'krishnarajapuram'], latitude: 13.007, longitude: 77.695 },
  { name: 'Mahadevapura', aliases: [], latitude: 12.9916, longitude: 77.689 },
  { name: 'Brookefield', aliases: [], latitude: 12.966, longitude: 77.718 },
];

export const findArea = (name: string): Area | undefined => {
  const n = name.trim().toLowerCase();
  if (!n) return undefined;
  return AREAS.find((a) => a.name.toLowerCase() === n || a.aliases.includes(n));
};

// First area mentioned in the text, matched on whole words.
export const findAreaInText = (text: string): Area | undefined => {
  const t = ` ${text.toLowerCase().replace(/[^a-z0-9.\- ]+/g, ' ')} `;
  return AREAS.find((a) =>
    [a.name.toLowerCase(), ...a.aliases].some((k) => t.includes(` ${k} `))
  );
};
