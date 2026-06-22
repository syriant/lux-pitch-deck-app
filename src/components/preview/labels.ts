/**
 * SYR-70 — static label catalogue for FIXED app text (table row labels, column
 * headers, section headings, unit words) that is the same on every deck and so
 * does NOT live in customFields. See lux-pitch-deck-api/docs/syr70-i18n-audit.md.
 *
 * Scheme: the English text IS the lookup id. `t(id, locale)` returns the
 * locale's value if catalogued, else the id (= English). So English needs no
 * entries and stays readable in the call sites; only non-English locales are
 * listed here. Mirror of lux-pitch-deck-api/src/modules/export/labels.ts —
 * keep the two in sync.
 */

type LocaleLabels = Record<string, string>;

const fr: LocaleLabels = {
  // Pricing-table row labels (deal-options, marketing-assets)
  'Campaign period': 'Période de campagne',
  'Travel dates': 'Dates de voyage',
  'Room night forecast': 'Prévision de nuitées',
  'Inclusions Value Adds': 'Inclusions et avantages',
  'NETT rate': 'Tarif NET',
  'Sell rate': 'Tarif de vente',
  'Surcharge – Season': 'Supplément – Saison',
  'Blackout dates': "Dates d'exclusion",
  'Allocation': 'Allotement',
  'Payment': 'Paiement',
  // Cell fragments / unit words
  'per night': 'par nuit',
  'rooms per night': 'chambres par nuit',
  'room nights': 'nuitées',
  'Room': 'Chambre',
  'VCC': 'VCC',
  // Option column headers
  'Option': 'Option',
  'One': 'Un',
  'Two': 'Deux',
  'Three': 'Trois',
  'Four': 'Quatre',
  'Five': 'Cinq',
  'Six': 'Six',
  // Tactical comparison rows — Investment Overview
  'Projected Room Nights & Revenue': 'Nuitées et revenus prévus',
  'Key Marketing Benefits': 'Principaux avantages marketing',
  'Secure Bookings with Strong Cancellation Terms and ZERO risk of no-shows':
    "Réservations sécurisées avec des conditions d'annulation strictes et AUCUN risque de non-présentation",
  'Market Leading Payment Terms': 'Conditions de paiement parmi les meilleures du marché',
  'Access to our LUX Plus Members': 'Accès à nos membres LUX Plus',
  // Tactical comparison rows — Amplification
  'Broadcast quality video of your property to maximise sales':
    'Vidéo de qualité broadcast de votre établissement pour maximiser les ventes',
  'Celebrity influencer content produced on-site':
    "Contenu d'influenceurs célèbres produit sur place",
  'Inventory': 'Inventaire',
  'Social media amplification': 'Amplification sur les réseaux sociaux',
  'eDM to Luxury Escapes database': 'eDM à la base de données Luxury Escapes',
  'Push Notification to Highest Engaged Luxury Escapes App Users':
    "Notification push aux utilisateurs les plus engagés de l'application Luxury Escapes",
  // Tactical package detail — section headings
  'NETT RATES PER PACKAGE': 'TARIFS NETS PAR FORFAIT',
  'SURCHARGE PERIODS': 'PÉRIODES DE SUPPLÉMENT',
  'BLACKOUT DATES': "DATES D'EXCLUSION",
  'EXTRA GUEST POLICY': 'POLITIQUE INVITÉ SUPPLÉMENTAIRE',
  'INCLUSIONS': 'INCLUSIONS',
  'EXTRA NIGHTS': 'NUITS SUPPLÉMENTAIRES',
  // Tactical package detail — column headers
  'Room Type': 'Type de chambre',
  'Allot.': 'Allot.',
  'Occ.': 'Occ.',
  'Nights': 'Nuits',
  'Extra Night': 'Nuit suppl.',
  'From': 'Du',
  'To': 'Au',
  'Period': 'Période',
  'Per Night': 'Par nuit',
  'Guest': 'Invité',
  'Age': 'Âge',
  'Fee per Night': 'Frais par nuit',
  // Tactical package detail — badge suffix / labels
  'TACTICAL PACKAGE': 'FORFAIT TACTIQUE',
  'PACKAGE': 'FORFAIT',
  // Region-stats metric labels + headings (item 4)
  'room nights per campaign': 'nuitées par campagne',
  'ALOS': 'DMS',
  'bookings from international markets': 'réservations des marchés internationaux',
  'booking window': 'délai de réservation',
  'of members upgraded their packages': 'des membres ont surclassé leur forfait',
  'Market Coverage': 'Couverture du marché',
  'Your Destination': 'Votre destination',
  // Reach region names (item 5)
  'North America': 'Amérique du Nord',
  'United Kingdom': 'Royaume-Uni',
  'Middle East': 'Moyen-Orient',
  'India': 'Inde',
  'Asia': 'Asie',
  'Australia': 'Australie',
  'New Zealand': 'Nouvelle-Zélande',
  // Campaign-options generated body (item 6)
  'From reviewing your rates in market and applied learnings from recent campaigns we have prepared {n} tailored {opt} for your review.':
    'Après examen de vos tarifs sur le marché et des enseignements tirés de campagnes récentes, nous avons préparé {n} {opt} sur mesure à votre attention.',
  'From reviewing your rates in market and applied learnings from recent campaigns I have prepared three tailored options for your review.':
    "Après examen de vos tarifs sur le marché et des enseignements tirés de campagnes récentes, j'ai préparé trois options sur mesure à votre attention.",
  'option': 'option',
  'options': 'options',
  'night': 'nuit',
  'nights': 'nuits',
  'from': 'à partir de',
  'includes': 'comprend',
  'details to be confirmed': 'détails à confirmer',
  // Footer (item 7)
  'updated': 'mis à jour',
  // Hotel intro — no-destination fallback sentence
  'Now is the ideal time to diversify distribution channels and capture greater market share with Luxury Escapes.':
    "C'est le moment idéal pour diversifier vos canaux de distribution et conquérir une plus grande part de marché avec Luxury Escapes.",
  // Empty-state / placeholder messages
  'No surcharges': 'Aucun supplément',
  'No rooms configured': 'Aucune chambre configurée',
  'No inclusions': 'Aucune inclusion',
  'No objectives set': 'Aucun objectif défini',
  'No deal options configured': 'Aucune option configurée',
  'No marketing assets configured': 'Aucune ressource marketing configurée',
  'No marketing assets selected': 'Aucune ressource marketing sélectionnée',
  'No tactical packages configured': 'Aucun forfait tactique configuré',
  'No case studies linked yet': 'Aucune étude de cas associée',
  'No case studies selected': 'Aucune étude de cas sélectionnée',
  'No campaign details configured': 'Aucun détail de campagne configuré',
  'Tactical package not configured': 'Forfait tactique non configuré',
  'Loading deal tier rules...': 'Chargement des règles de paliers…',
  'Custom page image missing': 'Image de page personnalisée manquante',
  'Custom page image not found': 'Image de page personnalisée introuvable',
  'Upload a pricing tool in the wizard (Step 2)': "Importez un outil de tarification dans l'assistant (étape 2)",
  'Assets are auto-recommended from deal tier rules (Step 6)':
    'Les ressources sont recommandées automatiquement selon les règles de paliers (étape 6)',
  'Configure tactical packages in Step 2': "Configurez les forfaits tactiques à l'étape 2",
  'Add objectives in the wizard (Step 4)': "Ajoutez des objectifs dans l'assistant (étape 4)",
  'Add case studies in the wizard (Step 5)': "Ajoutez des études de cas dans l'assistant (étape 5)",
  "Tick assets per option in Step 6, or set the property's grade and destination if no entitlements load":
    "Cochez les ressources par option à l'étape 6, ou définissez la catégorie et la destination de l'établissement si aucune autorisation ne se charge",
  'No marketing assets selected — tick assets per option in Step 6.':
    "Aucune ressource marketing sélectionnée — cochez les ressources par option à l'étape 6.",
};

/** BCP-47 tag for date formatting per UI locale. English keeps the AU format. */
export function dateLocaleTag(locale?: string | null): string {
  switch (locale) {
    case 'fr': return 'fr-FR';
    default: return 'en-AU';
  }
}

const LABELS: Record<string, LocaleLabels> = { fr };

/** Translate a fixed label. `id` is the English text; returns English if uncatalogued. */
export function t(id: string, locale?: string | null): string {
  if (!locale || locale === 'en') return id;
  return LABELS[locale]?.[id] ?? id;
}

const ORDINAL_WORDS = ['One', 'Two', 'Three', 'Four', 'Five', 'Six'];

/** "Option Two" / "Option 7" in the active language (used for table column headers). */
export function optionColumnLabel(num: number, locale?: string | null): string {
  const word = ORDINAL_WORDS[num - 1];
  return word ? `${t('Option', locale)} ${t(word, locale)}` : `${t('Option', locale)} ${num}`;
}
