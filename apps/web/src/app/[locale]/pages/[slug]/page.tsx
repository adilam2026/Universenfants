import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";

interface Section {
  heading?: string;
  paragraphs: string[];
}

interface PageContent {
  title: string;
  intro?: string;
  sections: Section[];
}

const CONTENT: Record<string, Record<"fr" | "ar", PageContent>> = {
  faq: {
    fr: {
      title: "Questions fréquentes",
      sections: [
        {
          heading: "Livraison",
          paragraphs: [
            "Nous livrons partout au Maroc. Les délais habituels sont de 24 à 72h selon la ville, et la livraison est gratuite dès 400 DH d'achat.",
          ],
        },
        {
          heading: "Paiement",
          paragraphs: [
            "Le paiement s'effectue à la livraison (espèces), directement auprès du livreur. Aucune carte bancaire n'est requise pour commander.",
          ],
        },
        {
          heading: "Retours et échanges",
          paragraphs: [
            "Un produit non conforme ou endommagé peut être retourné dans les 7 jours suivant la réception. Voir notre politique de retour pour le détail des conditions.",
          ],
        },
        {
          heading: "Suivi de commande",
          paragraphs: [
            "Une fois connecté, vous pouvez suivre l'état de vos commandes depuis la rubrique « Mon compte » : en préparation, expédiée, livrée.",
          ],
        },
      ],
    },
    ar: {
      title: "الأسئلة الشائعة",
      sections: [
        {
          heading: "التوصيل",
          paragraphs: [
            "نوصل إلى جميع مدن المغرب. آجال التوصيل المعتادة تتراوح بين 24 و72 ساعة حسب المدينة، والتوصيل مجاني ابتداءً من 400 درهم من المشتريات.",
          ],
        },
        {
          heading: "الأداء",
          paragraphs: ["الأداء يتم عند الاستلام (نقداً) مباشرة لدى عون التوصيل. لا حاجة لبطاقة بنكية لإتمام الطلب."],
        },
        {
          heading: "الإرجاع والاستبدال",
          paragraphs: [
            "يمكن إرجاع منتج غير مطابق أو تالف خلال 7 أيام من الاستلام. راجع سياسة الإرجاع لمعرفة الشروط بالتفصيل.",
          ],
        },
        {
          heading: "تتبع الطلب",
          paragraphs: ["بعد تسجيل الدخول، يمكنكم تتبع حالة طلباتكم من قسم «حسابي»: قيد التحضير، تم الشحن، تم التسليم."],
        },
      ],
    },
  },
  livraison: {
    fr: {
      title: "Livraison",
      sections: [
        {
          paragraphs: [
            "Nous livrons dans l'ensemble des villes du Maroc. Les frais de livraison sont calculés selon votre ville de destination et affichés avant validation de la commande.",
            "La livraison est offerte dès 400 DH d'achat.",
          ],
        },
        {
          heading: "Délais",
          paragraphs: [
            "Comptez généralement 24 à 48h dans les grandes villes et jusqu'à 72h dans les zones plus éloignées, à compter de la confirmation de votre commande.",
          ],
        },
        {
          heading: "Paiement à la livraison",
          paragraphs: ["Le règlement se fait en espèces directement auprès du livreur, au moment de la réception."],
        },
      ],
    },
    ar: {
      title: "التوصيل",
      sections: [
        {
          paragraphs: [
            "نوصل إلى جميع مدن المغرب. تُحتسب مصاريف التوصيل حسب مدينة الوجهة وتظهر قبل تأكيد الطلب.",
            "التوصيل مجاني ابتداءً من 400 درهم من المشتريات.",
          ],
        },
        {
          heading: "الآجال",
          paragraphs: ["عادةً ما بين 24 و48 ساعة في المدن الكبرى وحتى 72 ساعة في المناطق الأبعد، ابتداءً من تأكيد طلبكم."],
        },
        {
          heading: "الأداء عند الاستلام",
          paragraphs: ["يتم الأداء نقداً مباشرة لدى عون التوصيل عند استلام الطلب."],
        },
      ],
    },
  },
  contact: {
    fr: {
      title: "Contactez-nous",
      sections: [
        {
          paragraphs: [
            "Notre service client est disponible du lundi au samedi pour répondre à vos questions sur vos commandes, nos produits ou la livraison.",
          ],
        },
        {
          heading: "Par téléphone / WhatsApp",
          paragraphs: ["[Numéro à renseigner]"],
        },
        {
          heading: "Par email",
          paragraphs: ["[Adresse email à renseigner]"],
        },
      ],
    },
    ar: {
      title: "اتصل بنا",
      sections: [
        {
          paragraphs: ["فريق خدمة الزبناء متوفر من الاثنين إلى السبت للإجابة عن أسئلتكم حول طلباتكم ومنتجاتنا والتوصيل."],
        },
        { heading: "عبر الهاتف / واتساب", paragraphs: ["[رقم الهاتف]"] },
        { heading: "عبر البريد الإلكتروني", paragraphs: ["[البريد الإلكتروني]"] },
      ],
    },
  },
  apropos: {
    fr: {
      title: "À propos de nous",
      sections: [
        {
          paragraphs: [
            "UniversEnfants est une boutique en ligne marocaine dédiée aux jouets pour enfants, pensée pour offrir un large choix de produits sûrs et de qualité, à des prix accessibles, livrés partout au Maroc.",
            "Notre mission est simple : rendre le shopping de jouets simple, rapide et agréable pour les familles marocaines, avec un service client à l'écoute.",
          ],
        },
      ],
    },
    ar: {
      title: "من نحن",
      sections: [
        {
          paragraphs: [
            "UniversEnfants متجر مغربي إلكتروني متخصص في ألعاب الأطفال، يهدف إلى توفير تشكيلة واسعة من المنتجات الآمنة والجيدة الجودة بأسعار في المتناول، مع التوصيل إلى جميع أنحاء المغرب.",
            "مهمتنا بسيطة: جعل تسوق الألعاب سهلاً وسريعاً وممتعاً للعائلات المغربية، مع خدمة زبناء تستمع إليكم.",
          ],
        },
      ],
    },
  },
  cgv: {
    fr: {
      title: "Conditions générales de vente",
      intro: "Dernière mise à jour : [date]",
      sections: [
        {
          heading: "1. Objet",
          paragraphs: [
            "Les présentes conditions générales régissent les ventes de produits effectuées sur le site UniversEnfants entre [Nom de la société], et toute personne physique ou morale procédant à un achat (le « Client »).",
          ],
        },
        {
          heading: "2. Commande",
          paragraphs: [
            "Toute commande passée sur le site implique l'acceptation sans réserve des présentes conditions générales de vente.",
          ],
        },
        {
          heading: "3. Prix et paiement",
          paragraphs: [
            "Les prix sont indiqués en dirhams marocains (DH), toutes taxes comprises. Le paiement s'effectue exclusivement à la livraison.",
          ],
        },
        {
          heading: "4. Livraison",
          paragraphs: ["Les modalités et délais de livraison sont détaillés dans notre page Livraison."],
        },
        {
          heading: "5. Droit de rétractation et retours",
          paragraphs: ["Voir notre politique de retour pour le détail des conditions et délais applicables."],
        },
        {
          heading: "6. Litiges",
          paragraphs: [
            "Les présentes conditions sont soumises au droit marocain. Tout litige relève de la compétence des tribunaux marocains.",
          ],
        },
      ],
    },
    ar: {
      title: "الشروط العامة للبيع",
      intro: "آخر تحديث: [التاريخ]",
      sections: [
        {
          heading: "1. الموضوع",
          paragraphs: [
            "تحكم هذه الشروط العامة عمليات بيع المنتجات المنجزة عبر موقع UniversEnfants بين [اسم الشركة] وكل شخص طبيعي أو معنوي يقوم بعملية شراء («الزبون»).",
          ],
        },
        { heading: "2. الطلب", paragraphs: ["كل طلب يتم إنجازه عبر الموقع يعني القبول التام لهذه الشروط العامة للبيع."] },
        {
          heading: "3. الأثمنة والأداء",
          paragraphs: ["الأثمنة محددة بالدرهم المغربي، شاملة لجميع الضرائب. يتم الأداء حصراً عند الاستلام."],
        },
        { heading: "4. التوصيل", paragraphs: ["تفاصيل شروط وآجال التوصيل موضحة في صفحة التوصيل."] },
        { heading: "5. حق التراجع والإرجاع", paragraphs: ["راجع سياسة الإرجاع لمعرفة الشروط والآجال المعمول بها."] },
        {
          heading: "6. النزاعات",
          paragraphs: ["تخضع هذه الشروط للقانون المغربي. يعود الاختصاص في أي نزاع للمحاكم المغربية."],
        },
      ],
    },
  },
  confidentialite: {
    fr: {
      title: "Politique de confidentialité",
      intro: "Conforme à la loi n° 09-08 relative à la protection des personnes physiques à l'égard du traitement des données à caractère personnel.",
      sections: [
        {
          heading: "Données collectées",
          paragraphs: [
            "Nous collectons les informations nécessaires au traitement de vos commandes : nom, téléphone, adresse de livraison et, le cas échéant, adresse email.",
          ],
        },
        {
          heading: "Utilisation des données",
          paragraphs: [
            "Ces données sont utilisées exclusivement pour traiter vos commandes, assurer la livraison et vous contacter en cas de besoin. Elles ne sont jamais vendues à des tiers.",
          ],
        },
        {
          heading: "Vos droits",
          paragraphs: [
            "Conformément à la loi 09-08, vous disposez d'un droit d'accès, de rectification et de suppression de vos données personnelles. Pour l'exercer, contactez-nous via notre page Contact.",
          ],
        },
      ],
    },
    ar: {
      title: "سياسة الخصوصية",
      intro: "وفقاً للقانون رقم 09-08 المتعلق بحماية الأشخاص الذاتيين تجاه معالجة المعطيات ذات الطابع الشخصي.",
      sections: [
        {
          heading: "المعطيات المجمعة",
          paragraphs: ["نجمع المعلومات الضرورية لمعالجة طلباتكم: الاسم، الهاتف، عنوان التوصيل، وعند الاقتضاء البريد الإلكتروني."],
        },
        {
          heading: "استعمال المعطيات",
          paragraphs: ["تُستعمل هذه المعطيات حصراً لمعالجة طلباتكم وضمان التوصيل والتواصل معكم عند الحاجة. لا يتم بيعها أبداً لأطراف ثالثة."],
        },
        {
          heading: "حقوقكم",
          paragraphs: ["وفقاً للقانون 09-08، لكم الحق في الاطلاع على معطياتكم الشخصية وتصحيحها وحذفها. لممارسة هذا الحق، تواصلوا معنا عبر صفحة الاتصال."],
        },
      ],
    },
  },
  retour: {
    fr: {
      title: "Politique de retour",
      sections: [
        {
          paragraphs: [
            "Si un produit reçu est endommagé, non conforme à votre commande, ou ne vous convient pas, vous pouvez demander un retour dans les 7 jours suivant la réception.",
          ],
        },
        {
          heading: "Conditions",
          paragraphs: [
            "Le produit doit être retourné dans son emballage d'origine, non utilisé et complet. Contactez notre service client via la page Contact pour lancer une demande de retour.",
          ],
        },
        {
          heading: "Remboursement",
          paragraphs: [
            "Après vérification du produit retourné, le remboursement ou l'échange est effectué dans les meilleurs délais.",
          ],
        },
      ],
    },
    ar: {
      title: "سياسة الإرجاع",
      sections: [
        {
          paragraphs: [
            "إذا كان المنتج المستلم تالفاً أو غير مطابق لطلبكم أو لا يناسبكم، يمكنكم طلب إرجاعه خلال 7 أيام من تاريخ الاستلام.",
          ],
        },
        {
          heading: "الشروط",
          paragraphs: ["يجب إرجاع المنتج في تغليفه الأصلي، دون استعمال وكاملاً. تواصلوا مع خدمة الزبناء عبر صفحة الاتصال لبدء طلب الإرجاع."],
        },
        {
          heading: "الاسترجاع",
          paragraphs: ["بعد التحقق من المنتج المُرجع، يتم الاسترجاع أو الاستبدال في أقرب الآجال."],
        },
      ],
    },
  },
};

export function generateStaticParams() {
  return routing.locales.flatMap((locale) => Object.keys(CONTENT).map((slug) => ({ locale, slug })));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { locale, slug } = await params;
  const content = CONTENT[slug]?.[locale as "fr" | "ar"];
  return { title: content?.title ?? "UniversEnfants" };
}

export default async function InfoPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const content = CONTENT[slug]?.[locale as "fr" | "ar"];
  if (!content) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 md:px-7 py-8">
      <h1 className="font-display text-2xl font-extrabold mb-2">{content.title}</h1>
      {content.intro && <p className="text-sm text-muted-foreground mb-6">{content.intro}</p>}
      <div className="flex flex-col gap-6 mt-4">
        {content.sections.map((section, i) => (
          <section key={i}>
            {section.heading && <h2 className="font-display text-lg font-bold mb-2">{section.heading}</h2>}
            {section.paragraphs.map((p, j) => (
              <p key={j} className="text-sm text-muted-foreground leading-relaxed mt-1.5 first:mt-0">
                {p}
              </p>
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}
