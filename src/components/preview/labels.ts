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
  'Revenue forecast': 'Prévision de revenus',
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
  'Europe': 'Europe',
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
  // Case study slide title
  'Case Studies': 'Études de cas',
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


const es: LocaleLabels = {
  // Pricing-table row labels (deal-options, marketing-assets)
  'Campaign period': 'Período de campaña',
  'Travel dates': 'Fechas de viaje',
  'Room night forecast': 'Previsión de noches de habitación',
  'Revenue forecast': 'Previsión de ingresos',
  'Inclusions Value Adds': 'Inclusiones y ventajas',
  'NETT rate': 'Tarifa NETA',
  'Sell rate': 'Tarifa de venta',
  'Surcharge – Season': 'Suplemento – Temporada',
  'Blackout dates': 'Fechas no disponibles',
  'Allocation': 'Asignación',
  'Payment': 'Pago',
  // Cell fragments / unit words
  'per night': 'por noche',
  'rooms per night': 'habitaciones por noche',
  'room nights': 'noches de habitación',
  'Room': 'Habitación',
  'VCC': 'VCC',
  // Option column headers
  'Option': 'Opción',
  'One': 'Uno',
  'Two': 'Dos',
  'Three': 'Tres',
  'Four': 'Cuatro',
  'Five': 'Cinco',
  'Six': 'Seis',
  // Tactical comparison rows — Investment Overview
  'Projected Room Nights & Revenue': 'Noches de habitación e ingresos previstos',
  'Key Marketing Benefits': 'Principales ventajas de marketing',
  'Secure Bookings with Strong Cancellation Terms and ZERO risk of no-shows':
    'Reservas seguras con condiciones de cancelación estrictas y CERO riesgo de no-shows',
  'Market Leading Payment Terms': 'Condiciones de pago líderes del mercado',
  'Access to our LUX Plus Members': 'Acceso a nuestros miembros LUX Plus',
  // Tactical comparison rows — Amplification
  'Broadcast quality video of your property to maximise sales':
    'Vídeo de calidad broadcast de su establecimiento para maximizar las ventas',
  'Celebrity influencer content produced on-site':
    'Contenido de influencers famosos producido in situ',
  'Inventory': 'Inventario',
  'Social media amplification': 'Amplificación en redes sociales',
  'eDM to Luxury Escapes database': 'eDM a la base de datos de Luxury Escapes',
  'Push Notification to Highest Engaged Luxury Escapes App Users':
    'Notificación push a los usuarios más activos de la app de Luxury Escapes',
  // Tactical package detail — section headings
  'NETT RATES PER PACKAGE': 'TARIFAS NETAS POR PAQUETE',
  'SURCHARGE PERIODS': 'PERÍODOS DE SUPLEMENTO',
  'BLACKOUT DATES': 'FECHAS NO DISPONIBLES',
  'EXTRA GUEST POLICY': 'POLÍTICA DE HUÉSPED ADICIONAL',
  'INCLUSIONS': 'INCLUSIONES',
  'EXTRA NIGHTS': 'NOCHES ADICIONALES',
  // Tactical package detail — column headers
  'Room Type': 'Tipo de habitación',
  'Allot.': 'Asign.',
  'Occ.': 'Ocup.',
  'Nights': 'Noches',
  'Extra Night': 'Noche adic.',
  'From': 'Desde',
  'To': 'Hasta',
  'Period': 'Período',
  'Per Night': 'Por noche',
  'Guest': 'Huésped',
  'Age': 'Edad',
  'Fee per Night': 'Tarifa por noche',
  // Tactical package detail — badge suffix / labels
  'TACTICAL PACKAGE': 'PAQUETE TÁCTICO',
  'PACKAGE': 'PAQUETE',
  // Region-stats metric labels + headings (item 4)
  'room nights per campaign': 'noches de habitación por campaña',
  'ALOS': 'DME',
  'bookings from international markets': 'reservas de mercados internacionales',
  'booking window': 'ventana de reserva',
  'of members upgraded their packages': 'de los miembros mejoraron su paquete',
  'Market Coverage': 'Cobertura de mercado',
  'Your Destination': 'Su destino',
  // Reach region names (item 5)
  'North America': 'Norteamérica',
  'United Kingdom': 'Reino Unido',
  'Europe': 'Europa',
  'Middle East': 'Oriente Medio',
  'India': 'India',
  'Asia': 'Asia',
  'Australia': 'Australia',
  'New Zealand': 'Nueva Zelanda',
  // Campaign-options generated body (item 6)
  'From reviewing your rates in market and applied learnings from recent campaigns we have prepared {n} tailored {opt} for your review.':
    'Tras revisar sus tarifas en el mercado y aplicar los aprendizajes de campañas recientes, hemos preparado {n} {opt} a medida para su consideración.',
  'From reviewing your rates in market and applied learnings from recent campaigns I have prepared three tailored options for your review.':
    'Tras revisar sus tarifas en el mercado y aplicar los aprendizajes de campañas recientes, he preparado tres opciones a medida para su consideración.',
  'option': 'opción',
  'options': 'opciones',
  'night': 'noche',
  'nights': 'noches',
  'from': 'desde',
  'includes': 'incluye',
  'details to be confirmed': 'detalles por confirmar',
  // Footer (item 7)
  'updated': 'actualizado',
  // Case study slide title
  'Case Studies': 'Casos de éxito',
  // Hotel intro — no-destination fallback sentence
  'Now is the ideal time to diversify distribution channels and capture greater market share with Luxury Escapes.':
    'Ahora es el momento ideal para diversificar los canales de distribución y conquistar una mayor cuota de mercado con Luxury Escapes.',
  // Empty-state / placeholder messages
  'No surcharges': 'Sin suplementos',
  'No rooms configured': 'No hay habitaciones configuradas',
  'No inclusions': 'Sin inclusiones',
  'No objectives set': 'No hay objetivos definidos',
  'No deal options configured': 'No hay opciones configuradas',
  'No marketing assets configured': 'No hay recursos de marketing configurados',
  'No marketing assets selected': 'No hay recursos de marketing seleccionados',
  'No tactical packages configured': 'No hay paquetes tácticos configurados',
  'No case studies linked yet': 'Aún no hay casos asociados',
  'No case studies selected': 'No hay casos seleccionados',
  'No campaign details configured': 'No hay detalles de campaña configurados',
  'Tactical package not configured': 'Paquete táctico no configurado',
  'Loading deal tier rules...': 'Cargando reglas de niveles…',
  'Custom page image missing': 'Falta la imagen de página personalizada',
  'Custom page image not found': 'Imagen de página personalizada no encontrada',
  'Upload a pricing tool in the wizard (Step 2)': 'Importe una herramienta de tarificación en el asistente (paso 2)',
  'Assets are auto-recommended from deal tier rules (Step 6)':
    'Los recursos se recomiendan automáticamente según las reglas de niveles (paso 6)',
  'Configure tactical packages in Step 2': 'Configure los paquetes tácticos en el paso 2',
  'Add objectives in the wizard (Step 4)': 'Añada objetivos en el asistente (paso 4)',
  'Add case studies in the wizard (Step 5)': 'Añada casos en el asistente (paso 5)',
  "Tick assets per option in Step 6, or set the property's grade and destination if no entitlements load":
    'Marque los recursos por opción en el paso 6, o defina la categoría y el destino del establecimiento si no se cargan las autorizaciones',
  'No marketing assets selected — tick assets per option in Step 6.':
    'No hay recursos de marketing seleccionados — marque los recursos por opción en el paso 6.',
};

const it: LocaleLabels = {
  // Pricing-table row labels (deal-options, marketing-assets)
  'Campaign period': 'Periodo della campagna',
  'Travel dates': 'Date di viaggio',
  'Room night forecast': 'Previsione di pernottamenti',
  'Revenue forecast': 'Previsione di ricavi',
  'Inclusions Value Adds': 'Inclusioni e vantaggi',
  'NETT rate': 'Tariffa NETTA',
  'Sell rate': 'Tariffa di vendita',
  'Surcharge – Season': 'Supplemento – Stagione',
  'Blackout dates': 'Date di chiusura',
  'Allocation': 'Allotment',
  'Payment': 'Pagamento',
  // Cell fragments / unit words
  'per night': 'a notte',
  'rooms per night': 'camere a notte',
  'room nights': 'pernottamenti',
  'Room': 'Camera',
  'VCC': 'VCC',
  // Option column headers
  'Option': 'Opzione',
  'One': 'Uno',
  'Two': 'Due',
  'Three': 'Tre',
  'Four': 'Quattro',
  'Five': 'Cinque',
  'Six': 'Sei',
  // Tactical comparison rows — Investment Overview
  'Projected Room Nights & Revenue': 'Pernottamenti e ricavi previsti',
  'Key Marketing Benefits': 'Principali vantaggi di marketing',
  'Secure Bookings with Strong Cancellation Terms and ZERO risk of no-shows':
    'Prenotazioni sicure con condizioni di cancellazione rigorose e ZERO rischio di no-show',
  'Market Leading Payment Terms': 'Condizioni di pagamento ai vertici del mercato',
  'Access to our LUX Plus Members': 'Accesso ai nostri membri LUX Plus',
  // Tactical comparison rows — Amplification
  'Broadcast quality video of your property to maximise sales':
    'Video di qualità broadcast della vostra struttura per massimizzare le vendite',
  'Celebrity influencer content produced on-site':
    'Contenuti di influencer famosi prodotti in loco',
  'Inventory': 'Inventario',
  'Social media amplification': 'Amplificazione sui social media',
  'eDM to Luxury Escapes database': 'eDM al database di Luxury Escapes',
  'Push Notification to Highest Engaged Luxury Escapes App Users':
    "Notifica push agli utenti più attivi dell'app Luxury Escapes",
  // Tactical package detail — section headings
  'NETT RATES PER PACKAGE': 'TARIFFE NETTE PER PACCHETTO',
  'SURCHARGE PERIODS': 'PERIODI DI SUPPLEMENTO',
  'BLACKOUT DATES': 'DATE DI CHIUSURA',
  'EXTRA GUEST POLICY': 'POLITICA OSPITE AGGIUNTIVO',
  'INCLUSIONS': 'INCLUSIONI',
  'EXTRA NIGHTS': 'NOTTI AGGIUNTIVE',
  // Tactical package detail — column headers
  'Room Type': 'Tipo di camera',
  'Allot.': 'Allot.',
  'Occ.': 'Occ.',
  'Nights': 'Notti',
  'Extra Night': 'Notte agg.',
  'From': 'Dal',
  'To': 'Al',
  'Period': 'Periodo',
  'Per Night': 'A notte',
  'Guest': 'Ospite',
  'Age': 'Età',
  'Fee per Night': 'Tariffa a notte',
  // Tactical package detail — badge suffix / labels
  'TACTICAL PACKAGE': 'PACCHETTO TATTICO',
  'PACKAGE': 'PACCHETTO',
  // Region-stats metric labels + headings (item 4)
  'room nights per campaign': 'pernottamenti per campagna',
  'ALOS': 'DMS',
  'bookings from international markets': 'prenotazioni dai mercati internazionali',
  'booking window': 'finestra di prenotazione',
  'of members upgraded their packages': "dei membri hanno fatto l'upgrade del pacchetto",
  'Market Coverage': 'Copertura di mercato',
  'Your Destination': 'La vostra destinazione',
  // Reach region names (item 5)
  'North America': 'America del Nord',
  'United Kingdom': 'Regno Unito',
  'Europe': 'Europa',
  'Middle East': 'Medio Oriente',
  'India': 'India',
  'Asia': 'Asia',
  'Australia': 'Australia',
  'New Zealand': 'Nuova Zelanda',
  // Campaign-options generated body (item 6)
  'From reviewing your rates in market and applied learnings from recent campaigns we have prepared {n} tailored {opt} for your review.':
    'Dopo aver esaminato le vostre tariffe sul mercato e applicato gli insegnamenti delle campagne recenti, abbiamo preparato {n} {opt} su misura per la vostra valutazione.',
  'From reviewing your rates in market and applied learnings from recent campaigns I have prepared three tailored options for your review.':
    'Dopo aver esaminato le vostre tariffe sul mercato e applicato gli insegnamenti delle campagne recenti, ho preparato tre opzioni su misura per la vostra valutazione.',
  'option': 'opzione',
  'options': 'opzioni',
  'night': 'notte',
  'nights': 'notti',
  'from': 'da',
  'includes': 'include',
  'details to be confirmed': 'dettagli da confermare',
  // Footer (item 7)
  'updated': 'aggiornato',
  // Case study slide title
  'Case Studies': 'Casi di studio',
  // Hotel intro — no-destination fallback sentence
  'Now is the ideal time to diversify distribution channels and capture greater market share with Luxury Escapes.':
    'È il momento ideale per diversificare i canali di distribuzione e conquistare una maggiore quota di mercato con Luxury Escapes.',
  // Empty-state / placeholder messages
  'No surcharges': 'Nessun supplemento',
  'No rooms configured': 'Nessuna camera configurata',
  'No inclusions': 'Nessuna inclusione',
  'No objectives set': 'Nessun obiettivo definito',
  'No deal options configured': 'Nessuna opzione configurata',
  'No marketing assets configured': 'Nessuna risorsa di marketing configurata',
  'No marketing assets selected': 'Nessuna risorsa di marketing selezionata',
  'No tactical packages configured': 'Nessun pacchetto tattico configurato',
  'No case studies linked yet': 'Nessun caso di studio ancora associato',
  'No case studies selected': 'Nessun caso di studio selezionato',
  'No campaign details configured': 'Nessun dettaglio della campagna configurato',
  'Tactical package not configured': 'Pacchetto tattico non configurato',
  'Loading deal tier rules...': 'Caricamento delle regole dei livelli…',
  'Custom page image missing': 'Immagine della pagina personalizzata mancante',
  'Custom page image not found': 'Immagine della pagina personalizzata non trovata',
  'Upload a pricing tool in the wizard (Step 2)': 'Importate uno strumento di tariffazione nella procedura guidata (passaggio 2)',
  'Assets are auto-recommended from deal tier rules (Step 6)':
    'Le risorse sono consigliate automaticamente in base alle regole dei livelli (passaggio 6)',
  'Configure tactical packages in Step 2': 'Configurate i pacchetti tattici nel passaggio 2',
  'Add objectives in the wizard (Step 4)': 'Aggiungete obiettivi nella procedura guidata (passaggio 4)',
  'Add case studies in the wizard (Step 5)': 'Aggiungete casi di studio nella procedura guidata (passaggio 5)',
  "Tick assets per option in Step 6, or set the property's grade and destination if no entitlements load":
    'Selezionate le risorse per opzione nel passaggio 6, oppure impostate la categoria e la destinazione della struttura se non si caricano le autorizzazioni',
  'No marketing assets selected — tick assets per option in Step 6.':
    'Nessuna risorsa di marketing selezionata — selezionate le risorse per opzione nel passaggio 6.',
};


const ja: LocaleLabels = {
  // Pricing-table row labels (deal-options, marketing-assets)
  'Campaign period': 'キャンペーン期間',
  'Travel dates': '旅行日程',
  'Room night forecast': '延べ宿泊室数の予測',
  'Revenue forecast': '収益予測',
  'Inclusions Value Adds': '特典・付加価値',
  'NETT rate': 'ネット料金',
  'Sell rate': '販売料金',
  'Surcharge – Season': '追加料金 – シーズン',
  'Blackout dates': '除外日',
  'Allocation': '割当',
  'Payment': '支払い',
  // Cell fragments / unit words
  'per night': '1泊あたり',
  'rooms per night': '1泊あたりの客室数',
  'room nights': '延べ宿泊室数',
  'Room': '客室',
  'VCC': 'VCC',
  // Option column headers
  'Option': 'オプション',
  'One': '1',
  'Two': '2',
  'Three': '3',
  'Four': '4',
  'Five': '5',
  'Six': '6',
  // Tactical comparison rows — Investment Overview
  'Projected Room Nights & Revenue': '予測延べ宿泊室数および収益',
  'Key Marketing Benefits': '主なマーケティング特典',
  'Secure Bookings with Strong Cancellation Terms and ZERO risk of no-shows':
    '厳格なキャンセル規定による確実な予約と、ノーショーのリスクゼロ',
  'Market Leading Payment Terms': '業界をリードする支払い条件',
  'Access to our LUX Plus Members': 'LUX Plus会員へのアクセス',
  // Tactical comparison rows — Amplification
  'Broadcast quality video of your property to maximise sales':
    '売上を最大化する放送品質の施設紹介動画',
  'Celebrity influencer content produced on-site':
    '現地で制作する著名インフルエンサーによるコンテンツ',
  'Inventory': '在庫',
  'Social media amplification': 'ソーシャルメディアでの拡散',
  'eDM to Luxury Escapes database': 'Luxury EscapesデータベースへのeDM配信',
  'Push Notification to Highest Engaged Luxury Escapes App Users':
    'Luxury Escapesアプリの最もアクティブな利用者へのプッシュ通知',
  // Tactical package detail — section headings
  'NETT RATES PER PACKAGE': 'パッケージ別ネット料金',
  'SURCHARGE PERIODS': '追加料金期間',
  'BLACKOUT DATES': '除外日',
  'EXTRA GUEST POLICY': '追加ゲストポリシー',
  'INCLUSIONS': '特典',
  'EXTRA NIGHTS': '追加宿泊',
  // Tactical package detail — column headers
  'Room Type': '客室タイプ',
  'Allot.': '割当',
  'Occ.': '定員',
  'Nights': '泊数',
  'Extra Night': '追加1泊',
  'From': '開始',
  'To': '終了',
  'Period': '期間',
  'Per Night': '1泊あたり',
  'Guest': 'ゲスト',
  'Age': '年齢',
  'Fee per Night': '1泊あたりの料金',
  // Tactical package detail — badge suffix / labels
  'TACTICAL PACKAGE': 'タクティカルパッケージ',
  'PACKAGE': 'パッケージ',
  // Region-stats metric labels + headings (item 4)
  'room nights per campaign': 'キャンペーンあたりの延べ宿泊室数',
  'ALOS': '平均宿泊日数',
  'bookings from international markets': '海外市場からの予約',
  'booking window': '予約リードタイム',
  'of members upgraded their packages': 'の会員がパッケージをアップグレード',
  'Market Coverage': '市場カバレッジ',
  'Your Destination': 'お客様の目的地',
  // Reach region names (item 5)
  'North America': '北米',
  'United Kingdom': '英国',
  'Europe': 'ヨーロッパ',
  'Middle East': '中東',
  'India': 'インド',
  'Asia': 'アジア',
  'Australia': 'オーストラリア',
  'New Zealand': 'ニュージーランド',
  // Campaign-options generated body (item 6)
  'From reviewing your rates in market and applied learnings from recent campaigns we have prepared {n} tailored {opt} for your review.':
    '市場における貴施設の料金を精査し、近年のキャンペーンから得た知見を踏まえ、ご検討用に{n}件のオーダーメイドの{opt}をご用意しました。',
  'From reviewing your rates in market and applied learnings from recent campaigns I have prepared three tailored options for your review.':
    '市場における貴施設の料金を精査し、近年のキャンペーンから得た知見を踏まえ、ご検討用に3件のオーダーメイドのオプションをご用意しました。',
  'option': 'オプション',
  'options': 'オプション',
  'night': '泊',
  'nights': '泊',
  'from': '〜',
  'includes': '含む',
  'details to be confirmed': '詳細は追ってご連絡します',
  // Footer (item 7)
  'updated': '更新日',
  // Case study slide title
  'Case Studies': '導入事例',
  // Hotel intro — no-destination fallback sentence
  'Now is the ideal time to diversify distribution channels and capture greater market share with Luxury Escapes.':
    '今こそ、Luxury Escapesとともに販売チャネルを多様化し、より大きな市場シェアを獲得する絶好の機会です。',
  // Empty-state / placeholder messages
  'No surcharges': '追加料金なし',
  'No rooms configured': '客室が設定されていません',
  'No inclusions': '特典なし',
  'No objectives set': '目標が設定されていません',
  'No deal options configured': 'オプションが設定されていません',
  'No marketing assets configured': 'マーケティング素材が設定されていません',
  'No marketing assets selected': 'マーケティング素材が選択されていません',
  'No tactical packages configured': 'タクティカルパッケージが設定されていません',
  'No case studies linked yet': '導入事例がまだ紐付けられていません',
  'No case studies selected': '導入事例が選択されていません',
  'No campaign details configured': 'キャンペーン詳細が設定されていません',
  'Tactical package not configured': 'タクティカルパッケージが設定されていません',
  'Loading deal tier rules...': 'ディールティアのルールを読み込んでいます…',
  'Custom page image missing': 'カスタムページの画像がありません',
  'Custom page image not found': 'カスタムページの画像が見つかりません',
  'Upload a pricing tool in the wizard (Step 2)': 'ウィザードで料金ツールをアップロードしてください（ステップ2）',
  'Assets are auto-recommended from deal tier rules (Step 6)':
    '素材はディールティアのルールに基づき自動的に推奨されます（ステップ6）',
  'Configure tactical packages in Step 2': 'ステップ2でタクティカルパッケージを設定してください',
  'Add objectives in the wizard (Step 4)': 'ウィザードで目標を追加してください（ステップ4）',
  'Add case studies in the wizard (Step 5)': 'ウィザードで導入事例を追加してください（ステップ5）',
  "Tick assets per option in Step 6, or set the property's grade and destination if no entitlements load":
    'ステップ6でオプションごとに素材をチェックするか、権限が読み込まれない場合は施設のグレードと目的地を設定してください',
  'No marketing assets selected — tick assets per option in Step 6.':
    'マーケティング素材が選択されていません — ステップ6でオプションごとに素材をチェックしてください。',
};

/** BCP-47 tag for date formatting per UI locale. English keeps the AU format. */
export function dateLocaleTag(locale?: string | null): string {
  switch (locale) {
    case 'fr': return 'fr-FR';
    case 'es': return 'es-ES';
    case 'it': return 'it-IT';
    case 'ja': return 'ja-JP';
    default: return 'en-AU';
  }
}

const LABELS: Record<string, LocaleLabels> = { fr, es, it, ja };

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
