export default {
  nav: { explore: 'Explore', scan: 'Scan', trip: 'My trip' },

  app: { tagline: 'Heritage guide to Hail' },

  welcome: {
    title: 'Athr',
    subtitle: 'Your guide to the heritage of Hail — in your language.',
    detected: 'Your device language',
    choose: 'Choose your language',
    search: 'Search for a language',
    noResults: 'No language by that name.',
    start: 'Start',
    count: '{count} languages',
    changeHint: 'You can change this at any time.',
  },

  explore: {
    search: 'Search a site or experience',
    searchLabel: 'Search sites',
    all: 'All',
    heading: 'Heritage sites',
    showing: '{shown} of {total}',
    empty: 'No matches',
    emptyHint: 'Try another word, or clear the filter.',
  },

  category: {
    rockArt: 'Rock art',
    fort: 'Forts & palaces',
    nature: 'Mountains & nature',
    museum: 'Museums',
  },

  site: {
    duration: 'Visit length',
    bestTime: 'Best time',
    distance: 'Distance',
    category: 'Category',
    story: 'The story',
    facts: 'Quick facts',
    tips: 'Visiting tips',
    map: 'Open in maps',
    plan: 'Plan a trip with this site',
    notFound: 'We could not find this site',
    back: 'Back to Explore',
    km: '{km} km from Hail',
    unesco: 'World Heritage',
    photoCredit: 'Photo',
    translationNote: 'Full stories are currently available in Arabic and English.',
  },

  time: { morning: 'Morning', afternoon: 'Afternoon', evening: 'Before sunset', any: 'Any time' },

  audio: {
    title: 'Audio guide',
    voice: 'AI-generated narration',
    play: 'Play narration',
    pause: 'Pause',
    back10: 'Back ten seconds',
    forward10: 'Forward ten seconds',
    speed: 'Playback speed',
    voicePick: 'Choose voice',
    position: 'Playback position',
  },

  scan: {
    title: 'Smart scan',
    subtitle: 'Point your camera at an engraving or building, and Athr will identify it and tell its story.',
    open: 'Open camera',
    opening: 'Opening camera…',
    upload: 'Upload a photo instead',
    failed: 'Could not open the camera',
    failedHint:
      'Permission may be denied, the device may have no camera, or the page was opened over an insecure link. Cameras require HTTPS.',
    privacy: 'Camera frames are analysed on your device. No image ever leaves it.',
    shutter: 'Start scanning',
    close: 'Close camera',
    gallery: 'Choose a photo from your gallery',
    pick: 'Choose a photo',
    hint: 'Frame the engraving',
    moving: 'Move the camera slowly over the engraving',
    stop: 'Stop scanning',
    matched: 'Identified',
    wasRight: 'Was this right?',
    yesRight: 'Yes, correct',
    notRight: 'No, not this one',
    notAPanel: 'Not a carving at all',
    wasCarving: 'Was there a carving?',
    noCarving: 'No, nothing here',
    yesCarving: 'Yes, there is one',
    whichPanel: 'Which panel is it?',
    cancel: 'Cancel',
    learned: 'Thanks — learned from this',
    tentative: 'Most likely',
    confidence: 'Confidence',
    evidence: 'What the analysis used',
    readMore: 'Read the full story and listen',
    again: 'Scan another site',
    unknown: 'We could not identify this',
    retry: 'Try again',
    demo: 'Demo mode',
    demoAuto: 'Automatic',
    demoHint: 'Pin the result to a specific site during a live demo.',
    demoLive: 'Recognition is live — this setting has no effect.',
    settings: 'Demo settings',
    provider: 'Provider',
    elapsed: 'Analysis time',
    stage: {
      capture: 'Capturing frame',
      features: 'Extracting visual features',
      match: 'Matching against site database',
      verify: 'Verifying historical context',
    },
  },

  thamudic: {

    title: 'Thamudic writing',

    notRead: 'This inscription has not been read yet. The letter chart below lets you match the shapes yourself.',

    readBy: 'Read by',

    showChart: 'Show the letter chart',

    hideChart: 'Hide the chart',

    source: 'Source',

    chartAlt: 'Chart of Jubbah\'s Thamudic letters',

    fact: {

      abjad: 'The script writes consonants only — no vowels — so one word can be read several ways.',

      direction: 'Direction varies: usually right to left, sometimes alternating line by line, sometimes vertical.',

      spacing: 'Words are usually not separated, so deciding where one ends is a judgement call.',

      content: 'Most inscriptions are personal names and short lineage: \'X son of Y\'.',

    },

  },

  trip: {
    title: 'My trip',
    subtitle: 'Answer three questions and Athr builds your route around your interests and the weather.',
    q1: 'What interests you?',
    q1hint: 'Pick one or more',
    q2: 'How many days?',
    q3: 'Trip pace',
    build: 'Build my route',
    building: 'Building your route…',
    ready: 'Your route is ready',
    sitesCount: '{count} sites',
    across: 'across {count} days',
    acrossOne: 'in a single day',
    edit: 'Edit',
    weather: 'Weather check',
    travel: '{minutes} min travel · {km} km',
    travelFromHail: 'From Hail: {minutes} min · {km} km',
    until: 'until {time}',
    excluded: 'Did not fit this trip',
    excludedHint: 'Add a day, or switch the pace to Packed.',
    note: 'Weather data from Open-Meteo · Distances calculated from site coordinates.',
    noteOffline: 'Could not fetch weather — showing Hail climate averages.',
    day: 'Day {n}',
    openMaps: 'Open in maps',
    navigate: 'Navigate here',
    routeDay: 'Whole day’s route in maps',
    dayDistance: 'Today’s driving: {km} km',
    step: {
      prefs: 'Reading your interests and trip length',
      weather: 'Checking the Hail forecast',
      order: 'Ordering sites by proximity and best hour',
    },
  },

  access: {
    offRoad: 'Part of the route is unpaved — a 4×4 is advised',
    guide: 'Visit with an accredited guide · arrange in advance',
    farDrive: 'About {hours} hours of driving each way',
  },

  /*
    Panels — a finer layer than the site. The visitor already knows they are at
    Jubbah; what they came for is this particular panel and what is on it.
  */
  panel: {
    heading: 'Panels at this site',
    count: '{count} documented panels',
    look: 'Look for',
    inscriptions: 'Carries Thamudic inscriptions',
    famous: 'The most famous at Jubbah',
    atSite: 'A panel at {site}',
    unknownSubject: 'Subject undetermined',
  },

  /* Carving eras. What separates them is centuries, not style. */
  era: {
    neolithic: 'Neolithic · about ten thousand years ago',
    later: 'After camel domestication · about three thousand years ago',
    thamudic: 'Thamudic period · centuries before Islam',
    neolithicShort: 'Neolithic',
    laterShort: 'Later',
    thamudicShort: 'Thamudic',
  },

  interest: {
    history: 'History & archaeology',
    nature: 'Nature & adventure',
    photography: 'Photography',
    culture: 'Culture & arts',
    family: 'Family activities',
  },

  interestShort: {
    history: 'history',
    nature: 'nature',
    photography: 'photography',
    culture: 'culture',
    family: 'family activities',
  },

  pace: {
    relaxed: 'Relaxed',
    relaxedHint: 'One or two sites a day',
    balanced: 'Balanced',
    balancedHint: 'A full day without rushing',
    packed: 'Packed',
    packedHint: 'Maximum coverage',
  },

  days: { one: 'One day', two: 'Two days', three: 'Three days' },

  weather: {
    sunny: 'Sunny',
    hot: 'Very hot',
    dusty: 'Wind & dust',
    cloudy: 'Partly cloudy',
    rain: 'Rain',
    adviceDusty: 'Dust-raising winds — we moved open-air sites to the early morning.',
    adviceHot: 'Reaching {temp}° at midday — outdoor visits moved to the morning, the museum takes the midday heat.',
    adviceFine: 'Good conditions — we ordered the route by each site’s best hour.',
  },

  reason: {
    wind: 'Moved to early morning to avoid wind and dust.',
    indoor: 'Indoors and air-conditioned — placed in the hottest hours.',
    outdoor: 'Open-air site, scheduled outside the midday heat.',
    interest: 'Matches your interest in {interests}.',
    unesco: 'A World Heritage site — Hail is not complete without it.',
    bestTime: 'Best visited in the {time}.',
  },

  common: {
    minutes: '{n} min',
    hour: '1 hour',
    twoHours: '2 hours',
    hours: '{n} hours',
    half: '30 min',
    and: 'and',
    language: 'Language',
    changeLanguage: 'Change language',
  },
}
