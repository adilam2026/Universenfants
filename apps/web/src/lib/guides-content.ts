// Contenu éditorial "Guides & conseils" — écrit à la main, pas de CMS pour
// l'instant (voir pages/[slug] pour le même choix côté pages légales). Les
// `productSlugs` référencent de vrais `seoUrl` du catalogue : les fiches
// produit affichées sont toujours chargées depuis l'API au rendu (jamais de
// prix/stock/disponibilité codés en dur ici), donc jamais désynchronisées du
// catalogue réel.

export interface GuideSection {
  heading?: string;
  paragraphs: string[];
  productSlugs?: string[];
}

export interface GuideContent {
  title: string;
  excerpt: string;
  readMinutes: number;
  sections: GuideSection[];
}

export interface Guide {
  slug: string;
  emoji: string;
  gradient: string;
  fr: GuideContent;
  ar: GuideContent;
}

export const GUIDES: Guide[] = [
  {
    slug: "choisir-jouet-selon-age",
    emoji: "🎯",
    gradient: "linear-gradient(150deg, #4fae72, #3a8c58)",
    fr: {
      title: "Choisir le bon âge : ce que l'étiquette ne dit pas",
      excerpt: "La tranche d'âge indiquée sur un jouet est un repère de sécurité, pas un niveau. Voici comment vérifier si un jouet convient vraiment à votre enfant.",
      readMinutes: 4,
      sections: [
        {
          paragraphs: [
            "« 3-5 ans », « 6-8 ans »… ces tranches d'âge existent d'abord pour la sécurité (petites pièces, résistance des matériaux), pas pour indiquer le niveau réel de votre enfant. Résultat : un enfant de 4 ans très à l'aise en motricité fine se lasse d'un jouet « 3-5 ans » en quelques jours, tandis qu'un enfant de 6 ans qui découvre à peine les jeux de société se sent largué avec un jeu « 6-8 ans » aux règles trop écrites.",
          ],
        },
        {
          heading: "Le réflexe à prendre avant d'acheter",
          paragraphs: [
            "Ce que dit la fiche produit : « 3-5 ans ». Ce qu'il faut vérifier avant d'acheter : votre enfant tient-il déjà un crayon ou manipule-t-il de petites pièces sans les porter à la bouche ? A-t-il déjà un jouet similaire dont il s'est lassé rapidement ? Si oui, visez plutôt la tranche au-dessus.",
            "À l'inverse, pour un enfant qui découvre une catégorie de jouet pour la première fois (premier jeu de société, premier puzzle), viser la tranche du bas — voire en dessous — évite la frustration des premières minutes, souvent décisive pour qu'il y revienne seul.",
          ],
        },
        {
          heading: "0-2 ans : l'éveil sensoriel avant tout",
          paragraphs: [
            "À cet âge, ce qui compte est ce qui se touche, s'écoute et se manipule à deux mains — pas la complexité.",
          ],
          productSlugs: ["fisher-price-table-eveil-musicale", "chicco-portique-eveil", "lego-duplo-la-ferme", "doudou-musical-lapin"],
        },
        {
          heading: "3-5 ans : la découverte guidée",
          paragraphs: [
            "L'enfant commence à suivre une règle simple ou une histoire, mais a encore besoin d'un adulte pour démarrer le jeu.",
          ],
          productSlugs: ["circuit-de-billes-en-bois", "poupee-bebe-qui-pleure", "vtech-tablette-educative", "trottinette-3-roues"],
        },
        {
          heading: "6-8 ans : l'autonomie qui s'installe",
          paragraphs: [
            "Il peut suivre plusieurs règles à la fois et commence à jouer sans supervision constante — c'est le moment d'introduire des jeux avec un vrai objectif.",
          ],
          productSlugs: ["puzzle-100-pieces-animaux-du-monde", "figurines-super-heros-pack-6", "velo-enfant-16-pouces", "monopoly-junior"],
        },
        {
          heading: "9-12 ans : la vraie complexité",
          paragraphs: [
            "Recherche de défi technique, de stratégie ou de collection — le jouet doit pouvoir « tenir la distance » sur plusieurs mois.",
          ],
          productSlugs: ["lego-technic-voiture-de-course", "les-aventuriers-du-rail", "uno-edition-classique", "ballon-de-foot-taille-5"],
        },
      ],
    },
    ar: {
      title: "اختيار السن المناسب: ما لا تخبرك به البطاقة",
      excerpt: "الفئة العمرية المذكورة على اللعبة هي معيار سلامة، وليست مستوى. إليكم كيف تتحققون فعلاً من ملاءمة لعبة لطفلكم.",
      readMinutes: 4,
      sections: [
        {
          paragraphs: [
            "«3-5 سنوات»، «6-8 سنوات»... هذه الفئات موجودة أساساً لأسباب تتعلق بالسلامة (قطع صغيرة، متانة المواد)، وليس لتحديد المستوى الحقيقي لطفلكم. النتيجة: طفل يبلغ 4 سنوات ولديه مهارات حركية دقيقة متقدمة قد يمل من لعبة «3-5 سنوات» خلال أيام قليلة، بينما طفل يبلغ 6 سنوات ويكتشف الألعاب الجماعية للتو قد يشعر بالضياع أمام لعبة «6-8 سنوات» ذات قواعد معقدة.",
          ],
        },
        {
          heading: "الخطوة التي يجب اتخاذها قبل الشراء",
          paragraphs: [
            "ما تقوله بطاقة المنتج: «3-5 سنوات». ما يجب التحقق منه قبل الشراء: هل يمسك طفلكم القلم بالفعل أو يتعامل مع قطع صغيرة دون وضعها في فمه؟ هل سبق أن مل من لعبة مشابهة بسرعة؟ إذا كانت الإجابة نعم، فاختاروا الفئة الأعلى.",
            "على العكس، بالنسبة لطفل يكتشف نوعاً من الألعاب لأول مرة (أول لعبة جماعية، أول أحجية)، اختيار الفئة الأدنى — أو حتى أقل — يتجنب الإحباط في الدقائق الأولى، وهو أمر حاسم غالباً ليعود إليها بمفرده.",
          ],
        },
        {
          heading: "0-2 سنوات: الإيقاظ الحسي أولاً",
          paragraphs: ["في هذا السن، المهم هو ما يُلمس ويُسمع ويُمسك باليدين — وليس التعقيد."],
          productSlugs: ["fisher-price-table-eveil-musicale", "chicco-portique-eveil", "lego-duplo-la-ferme", "doudou-musical-lapin"],
        },
        {
          heading: "3-5 سنوات: الاكتشاف الموجّه",
          paragraphs: ["يبدأ الطفل باتباع قاعدة بسيطة أو قصة، لكنه لا يزال بحاجة إلى بالغ لبدء اللعبة."],
          productSlugs: ["circuit-de-billes-en-bois", "poupee-bebe-qui-pleure", "vtech-tablette-educative", "trottinette-3-roues"],
        },
        {
          heading: "6-8 سنوات: استقلالية متزايدة",
          paragraphs: ["يستطيع اتباع عدة قواعد في آن واحد ويبدأ باللعب دون إشراف مستمر — الوقت المناسب لألعاب ذات هدف حقيقي."],
          productSlugs: ["puzzle-100-pieces-animaux-du-monde", "figurines-super-heros-pack-6", "velo-enfant-16-pouces", "monopoly-junior"],
        },
        {
          heading: "9-12 سنة: التعقيد الحقيقي",
          paragraphs: ["البحث عن تحدٍ تقني أو استراتيجية أو تجميع — يجب أن تستمر اللعبة على مدى أشهر."],
          productSlugs: ["lego-technic-voiture-de-course", "les-aventuriers-du-rail", "uno-edition-classique", "ballon-de-foot-taille-5"],
        },
      ],
    },
  },
  {
    slug: "jouer-ensemble-jeux-de-societe",
    emoji: "🎲",
    gradient: "linear-gradient(150deg, #d98a3d, #b5702a)",
    fr: {
      title: "Jouer ensemble sans que ça tourne au clash",
      excerpt: "Trois jeux de société testés en famille, avec les ajustements de règles qui évitent les larmes et les crises devant le plateau.",
      readMinutes: 3,
      sections: [
        {
          paragraphs: [
            "Un jeu de société en famille tourne mal presque toujours pour la même raison : les règles officielles ne sont pas pensées pour un enfant qui perd pour la première fois, ou pour un écart d'âge entre frères et sœurs. Quelques ajustements simples suffisent à transformer la soirée.",
          ],
        },
        {
          heading: "Uno — retirez les cartes +4 pour un premier jeu",
          paragraphs: [
            "Avec un enfant qui découvre le jeu, les cartes « +4 » et « Inverser le sens » créent surtout de la confusion et des tours interminables. Les mettre de côté les premières parties permet de se concentrer sur l'essentiel : associer une couleur ou un chiffre.",
          ],
          productSlugs: ["uno-edition-classique"],
        },
        {
          heading: "Monopoly Junior — 20 minutes maximum avec un enfant de 6-7 ans",
          paragraphs: [
            "La version Junior est déjà raccourcie par rapport au jeu original, mais avec un enfant de 6-7 ans, mieux vaut fixer une fin de partie à l'avance (« on s'arrête au troisième tour complet ») plutôt que de jouer jusqu'à la faillite d'un joueur — l'attention décroche bien avant.",
          ],
          productSlugs: ["monopoly-junior"],
        },
        {
          heading: "Les Aventuriers du Rail — le bon jeu pour les pré-ados et les parents",
          paragraphs: [
            "À partir de 8-9 ans, ce jeu de stratégie devient un vrai terrain commun entre parent et enfant : les règles sont accessibles en 10 minutes, mais la partie garde un enjeu réel des deux côtés — contrairement à un jeu pensé uniquement pour les petits, personne ne « laisse gagner » l'autre.",
          ],
          productSlugs: ["les-aventuriers-du-rail"],
        },
        {
          heading: "Le vrai conseil qui change tout",
          paragraphs: [
            "Transformez la défaite en jeu plutôt qu'en fin de partie : « celui qui perd raconte une blague » ou « fait un tour de danse » désamorce la frustration bien mieux qu'un discours sur le fair-play.",
          ],
        },
      ],
    },
    ar: {
      title: "اللعب معاً دون أن ينتهي الأمر بمشاجرة",
      excerpt: "ثلاث ألعاب جماعية جُرّبت في العائلة، مع تعديلات القواعد التي تتجنب الدموع والأزمات أمام اللوحة.",
      readMinutes: 3,
      sections: [
        {
          paragraphs: [
            "غالباً ما تسوء أمسية الألعاب الجماعية العائلية لنفس السبب: القواعد الرسمية لم تُصمم لطفل يخسر لأول مرة، أو لفارق السن بين الإخوة. بضع تعديلات بسيطة كافية لتغيير مجرى الأمسية.",
          ],
        },
        {
          heading: "أونو — أزيلوا بطاقات +4 في أول لعبة",
          paragraphs: [
            "مع طفل يكتشف اللعبة، بطاقات «+4» و«عكس الاتجاه» تُحدث بالأساس ارتباكاً وجولات لا تنتهي. وضعها جانباً في المرات الأولى يسمح بالتركيز على الأساس: مطابقة لون أو رقم.",
          ],
          productSlugs: ["uno-edition-classique"],
        },
        {
          heading: "مونوبولي جونيور — 20 دقيقة كحد أقصى مع طفل يبلغ 6-7 سنوات",
          paragraphs: [
            "النسخة جونيور مختصرة أصلاً مقارنة باللعبة الأصلية، لكن مع طفل يبلغ 6-7 سنوات، من الأفضل تحديد نهاية الجولة مسبقاً («نتوقف عند الدور الثالث الكامل») بدلاً من اللعب حتى إفلاس أحد اللاعبين — الانتباه يتراجع قبل ذلك بكثير.",
          ],
          productSlugs: ["monopoly-junior"],
        },
        {
          heading: "مغامرو السكك الحديدية — اللعبة المناسبة للمراهقين واليافعين والآباء",
          paragraphs: [
            "ابتداءً من 8-9 سنوات، تصبح لعبة الاستراتيجية هذه أرضية مشتركة حقيقية بين الوالد والطفل: القواعد يمكن استيعابها خلال 10 دقائق، لكن الجولة تحتفظ برهان حقيقي لكلا الطرفين.",
          ],
          productSlugs: ["les-aventuriers-du-rail"],
        },
        {
          heading: "النصيحة الحقيقية التي تغيّر كل شيء",
          paragraphs: [
            "حوّلوا الخسارة إلى لعبة بدل نهاية للجولة: «من يخسر يروي نكتة» أو «يقوم برقصة» ينزع فتيل الإحباط أفضل بكثير من خطاب عن الروح الرياضية.",
          ],
        },
      ],
    },
  },
  {
    slug: "rentree-scolaire-checklist",
    emoji: "🎒",
    gradient: "linear-gradient(150deg, #9b7dd6, #7a5cc4)",
    fr: {
      title: "Rentrée scolaire : la vraie checklist",
      excerpt: "Ce qu'on oublie souvent en préparant le cartable — et pourquoi le poids du sac compte plus que son design.",
      readMinutes: 3,
      sections: [
        {
          paragraphs: [
            "Entre le cartable, la trousse et les fournitures, l'essentiel se joue souvent sur des détails qu'on ne voit pas sur une photo produit.",
          ],
        },
        {
          heading: "Le poids du cartable, avant tout",
          paragraphs: [
            "Un cartable trop lourd est l'une des premières causes de douleurs de dos chez les enfants du primaire : le poids total porté (cartable + contenu) ne devrait pas dépasser 10 à 15 % du poids de l'enfant. Un modèle ergonomique à dos rigide et bretelles larges répartit mieux la charge qu'un simple sac à dos souple.",
          ],
          productSlugs: ["cartable-premium-ergonomique", "sac-a-dos-maternelle"],
        },
        {
          heading: "Une trousse compartimentée évite de tout mélanger",
          paragraphs: [
            "Un enfant qui doit fouiller 5 minutes pour trouver sa gomme au milieu des crayons perd patience — et du temps de classe. Des compartiments séparés (stylos, petit matériel, règle) réduisent ce frottement au quotidien plus efficacement qu'une trousse à la mode mais mono-compartiment.",
          ],
          productSlugs: ["trousse-clairefontaine-3-compartiments"],
        },
        {
          heading: "Réviser les lettres et chiffres sans gâchis de papier",
          paragraphs: [
            "Pour les enfants en maternelle ou en CP, une ardoise effaçable permet de répéter un geste d'écriture autant de fois que nécessaire, sans utiliser une feuille à chaque essai — utile pour les 10 minutes de révision du soir sans que ça devienne une corvée.",
          ],
          productSlugs: ["ardoise-magique-effacable"],
        },
      ],
    },
    ar: {
      title: "الدخول المدرسي: القائمة الحقيقية",
      excerpt: "ما نغفل عنه غالباً عند تجهيز المحفظة — ولماذا وزن الحقيبة أهم من تصميمها.",
      readMinutes: 3,
      sections: [
        {
          paragraphs: ["بين المحفظة والمقلمة واللوازم، يتوقف الجوهري غالباً على تفاصيل لا تظهر في صورة المنتج."],
        },
        {
          heading: "وزن المحفظة، قبل كل شيء",
          paragraphs: [
            "المحفظة الثقيلة جداً من أهم أسباب آلام الظهر عند أطفال المرحلة الابتدائية: الوزن الإجمالي المحمول (المحفظة + محتواها) لا ينبغي أن يتجاوز 10 إلى 15% من وزن الطفل. النموذج المريح ذو الظهر الصلب والأحزمة العريضة يوزع الحمل بشكل أفضل من حقيبة ظهر لينة عادية.",
          ],
          productSlugs: ["cartable-premium-ergonomique", "sac-a-dos-maternelle"],
        },
        {
          heading: "مقلمة بأقسام متعددة تتجنب اختلاط الأدوات",
          paragraphs: [
            "الطفل الذي يبحث 5 دقائق عن الممحاة وسط الأقلام يفقد صبره — ووقتاً من الحصة الدراسية. الأقسام المنفصلة (أقلام، أدوات صغيرة، مسطرة) تقلل هذا الاحتكاك اليومي بفعالية أكبر من مقلمة عصرية لكن بقسم واحد.",
          ],
          productSlugs: ["trousse-clairefontaine-3-compartiments"],
        },
        {
          heading: "مراجعة الحروف والأرقام دون هدر الورق",
          paragraphs: [
            "بالنسبة لأطفال الروض أو السنة الأولى ابتدائي، اللوحة القابلة للمسح تتيح تكرار حركة الكتابة بقدر الحاجة، دون استخدام ورقة في كل محاولة — مفيدة لعشر دقائق من المراجعة المسائية دون أن تتحول إلى عبء.",
          ],
          productSlugs: ["ardoise-magique-effacable"],
        },
      ],
    },
  },
  {
    slug: "premier-velo-trottinette",
    emoji: "🚲",
    gradient: "linear-gradient(150deg, #4f9dae, #37788a)",
    fr: {
      title: "Premier vélo, première trottinette : est-il prêt ?",
      excerpt: "Les signes concrets à observer avant d'acheter — plutôt que de se fier uniquement à l'âge indiqué.",
      readMinutes: 3,
      sections: [
        {
          paragraphs: [
            "Deux enfants du même âge peuvent avoir des semaines d'écart en équilibre et en coordination. Avant de choisir entre trottinette et vélo, quelques signes valent mieux que la tranche d'âge affichée.",
          ],
        },
        {
          heading: "Trottinette 3 roues : le bon premier pas dès 3 ans",
          paragraphs: [
            "Le troisième point d'appui rend la trottinette plus stable qu'un vélo — c'est souvent le meilleur choix pour un enfant qui n'a encore jamais eu d'engin à roulettes. Signe qu'il est prêt : il tient déjà debout sur un pied 2 à 3 secondes sans s'appuyer.",
          ],
          productSlugs: ["trottinette-3-roues"],
        },
        {
          heading: "Vélo 16 pouces : au-delà de la draisienne",
          paragraphs: [
            "Avant de passer au vélo à pédales, vérifiez que l'enfant sait déjà freiner en marchant en poussant sur les talons (réflexe transposable au frein) et qu'il a déjà pratiqué la draisienne ou un vélo avec petites roues. Sans cette étape, prévoir des stabilisateurs plutôt que de sauter directement au 16 pouces sans roulettes.",
          ],
          productSlugs: ["velo-enfant-16-pouces"],
        },
        {
          heading: "Le vrai test avant d'acheter",
          paragraphs: [
            "En magasin ou à la livraison, faites asseoir l'enfant sur l'engin à l'arrêt : les deux pieds doivent toucher le sol avec les genoux légèrement fléchis. Un vélo ou une trottinette trop grands « pour qu'il grandisse dedans » retardent en réalité l'apprentissage plutôt que de l'accélérer.",
          ],
        },
      ],
    },
    ar: {
      title: "أول دراجة، أول سكوتر: هل هو جاهز؟",
      excerpt: "العلامات الملموسة التي يجب ملاحظتها قبل الشراء — بدلاً من الاعتماد فقط على السن المذكور.",
      readMinutes: 3,
      sections: [
        {
          paragraphs: [
            "قد يكون بين طفلين من نفس السن أسابيع من الفارق في التوازن والتناسق الحركي. قبل الاختيار بين السكوتر والدراجة، بعض العلامات أهم من الفئة العمرية المعلنة.",
          ],
        },
        {
          heading: "سكوتر بثلاث عجلات: الخطوة الأولى المناسبة ابتداءً من 3 سنوات",
          paragraphs: [
            "نقطة الارتكاز الثالثة تجعل السكوتر أكثر ثباتاً من الدراجة — غالباً الخيار الأفضل لطفل لم يجرب بعد أي وسيلة ذات عجلات. علامة الجاهزية: يقف بالفعل على قدم واحدة لمدة 2 إلى 3 ثوانٍ دون الاستناد.",
          ],
          productSlugs: ["trottinette-3-roues"],
        },
        {
          heading: "دراجة 16 بوصة: ما بعد دراجة التوازن",
          paragraphs: [
            "قبل الانتقال إلى الدراجة ذات الدواسات، تحققوا من أن الطفل يعرف بالفعل الفرملة أثناء المشي بالضغط على الكعبين (انعكاس قابل للنقل إلى الفرامل) وأنه جرب دراجة التوازن أو دراجة بعجلات صغيرة. دون هذه المرحلة، يُفضل توفير عجلات مساعدة بدل القفز مباشرة إلى مقاس 16 بوصة بدونها.",
          ],
          productSlugs: ["velo-enfant-16-pouces"],
        },
        {
          heading: "الاختبار الحقيقي قبل الشراء",
          paragraphs: [
            "في المتجر أو عند التسليم، اجعلوا الطفل يجلس على الدراجة وهي ثابتة: يجب أن تلامس القدمان الأرض مع ثني خفيف في الركبتين. دراجة أو سكوتر أكبر من اللازم «ليكبر فيها» يؤخران التعلم فعلياً بدل تسريعه.",
          ],
        },
      ],
    },
  },
  {
    slug: "cadeau-qui-dure",
    emoji: "🎁",
    gradient: "linear-gradient(150deg, #ff8fa3, #e56e85)",
    fr: {
      title: "Cadeau d'anniversaire : éviter le jouet oublié après 2 semaines",
      excerpt: "Les jouets qui durent ont un point commun : ils évoluent avec l'enfant plutôt que de s'épuiser en une seule utilisation.",
      readMinutes: 3,
      sections: [
        {
          paragraphs: [
            "Le jouet qui finit au fond du placard n'est presque jamais un mauvais jouet — c'est un jouet qui n'offrait qu'une seule façon d'y jouer. Deux critères simples permettent de repérer à l'avance un cadeau qui va durer.",
          ],
        },
        {
          heading: "Critère 1 : peut-on y jouer de plusieurs façons ?",
          paragraphs: [
            "Un set de construction (LEGO, Playmobil) se reconstruit différemment à chaque fois et peut se combiner avec d'autres sets déjà à la maison — contrairement à un jouet à fonction unique qui a « tout montré » dès la première demi-heure.",
          ],
          productSlugs: ["lego-city-commissariat-de-police", "playmobil-chateau-des-princesses", "hot-wheels-circuit-ultime"],
        },
        {
          heading: "Critère 2 : se joue-t-il à plusieurs ?",
          paragraphs: [
            "Un jouet qui invite un frère, une sœur ou un ami à jouer ensemble prend une valeur affective que le même jouet en solo n'a pas — c'est aussi ce qui le fait ressortir du placard des mois plus tard, pas seulement le jour de l'anniversaire.",
          ],
          productSlugs: ["barbie-maison-de-reve-3-etages"],
        },
        {
          heading: "Toujours hésitant ?",
          paragraphs: [
            "Le Conseiller Cadeau croise l'âge, le budget et le profil de l'enfant pour proposer une sélection réelle depuis notre catalogue en 30 secondes. Et pour un anniversaire, la Liste Anniversaire permet de partager les idées avec la famille pour éviter les doublons.",
          ],
        },
      ],
    },
    ar: {
      title: "هدية عيد الميلاد: تجنب اللعبة المنسية بعد أسبوعين",
      excerpt: "الألعاب التي تدوم لها قاسم مشترك: تتطور مع الطفل بدلاً من أن تُستنفد في استخدام واحد.",
      readMinutes: 3,
      sections: [
        {
          paragraphs: [
            "اللعبة التي تنتهي في زاوية الخزانة نادراً ما تكون لعبة سيئة — بل هي لعبة لم تقدم سوى طريقة واحدة للعب بها. معياران بسيطان يسمحان بتحديد الهدية التي ستدوم مسبقاً.",
          ],
        },
        {
          heading: "المعيار الأول: هل يمكن اللعب بها بعدة طرق؟",
          paragraphs: [
            "مجموعة بناء (ليغو، بلايموبيل) يُعاد بناؤها بشكل مختلف في كل مرة ويمكن دمجها مع مجموعات أخرى موجودة بالفعل في المنزل — على عكس لعبة ذات وظيفة واحدة أظهرت كل شيء منذ نصف الساعة الأولى.",
          ],
          productSlugs: ["lego-city-commissariat-de-police", "playmobil-chateau-des-princesses", "hot-wheels-circuit-ultime"],
        },
        {
          heading: "المعيار الثاني: هل تُلعب بها جماعياً؟",
          paragraphs: [
            "اللعبة التي تدعو أخاً أو أختاً أو صديقاً للعب معاً تكتسب قيمة عاطفية لا تملكها نفس اللعبة عند اللعب الفردي — وهذا أيضاً ما يجعلها تخرج من الخزانة بعد أشهر، وليس فقط يوم عيد الميلاد.",
          ],
          productSlugs: ["barbie-maison-de-reve-3-etages"],
        },
        {
          heading: "لا تزال متردداً؟",
          paragraphs: [
            "مستشار الهدايا يجمع بين السن والميزانية وملف الطفل لاقتراح تشكيلة حقيقية من كتالوجنا في 30 ثانية. وبالنسبة لعيد ميلاد، تتيح قائمة عيد الميلاد مشاركة الأفكار مع العائلة لتجنب التكرار.",
          ],
        },
      ],
    },
  },
];

export function getGuide(slug: string) {
  return GUIDES.find((g) => g.slug === slug);
}
