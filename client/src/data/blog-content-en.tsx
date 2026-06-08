import React from "react";
import { Link } from "wouter";

export const BLOG_META_EN: Record<string, { title: string; description: string }> = {
  "tyde-gotisk-skrift-guide": {
    title: "Decipher Gothic script: a guide for beginners",
    description:
      "Learn to decipher Gothic script: the alphabet, common pitfalls and practical exercises. How to read old letters, diaries and parish registers from before 1875.",
  },
  "slaegtsforskning-for-begyndere": {
    title: "Genealogy for beginners: getting off to a good start",
    description:
      "Genealogy for beginners: find your ancestors in parish registers and censuses on Arkivalieronline - and decipher the Gothic script that blocks your way.",
  },
  "gammel-dansk-retskrivning": {
    title: "Old Danish spelling: Aa, Å and capitalised nouns",
    description:
      "Understand old Danish spelling: why it says »Aa« instead of »Å«, and why nouns were capitalised before the 1948 reform.",
  },
  "kirkeboeger-folketaellinger-laese": {
    title: "Reading parish registers and censuses: a practical guide",
    description:
      "How to find and read parish registers and censuses on Arkivalieronline - and decipher the Gothic script that keeps your ancestors hidden.",
  },
  "udvandrerbreve-historie": {
    title: "Emigrant letters: the story of those who sailed to America",
    description:
      "More than 300,000 Danes emigrated to America. Their letters home are priceless - but written in Gothic script. Learn the history and have the letters deciphered.",
  },
  "oversaet-gamle-breve": {
    title: "Translate old letters: from Gothic script to readable text",
    description:
      "How to make old letters in Gothic script readable and translated - into modern Danish or into English for family abroad.",
  },
  "soenderjylland-familiehistorie": {
    title: "Southern Jutland: family history from 1864 to the Reunification of 1920",
    description:
      "The history of Southern Jutland families from the defeat of 1864 to the Reunification of 1920 - told in letters and diaries written in Gothic script. Here is how to decipher them.",
  },
  "gamle-maal-og-forkortelser": {
    title: "Old measures and abbreviations in handwritten recipes and documents",
    description:
      "Pound, lod, pægl and kvint: understand the old Danish measures and abbreviations you encounter in grandmother's cookbook and in old documents.",
  },
};

export const BLOG_CONTENT_EN: Record<string, React.ReactNode> = {
  "tyde-gotisk-skrift-guide": (
    <>
      <p className="leading-relaxed mb-4">
        Many families have letters, diaries or parish registers written in <strong>Gothic script</strong> - set down by grandparents or great-grandparents before about 1875. The script looks foreign and difficult at first glance. But with a little practice and the right <strong>Gothic alphabet</strong>, you will soon be able to decipher the first words and sentences. This guide gives a practical introduction to reading Gothic script.
      </p>
      <h2 className="font-serif text-xl font-semibold mt-8 mb-3">What is Gothic script?</h2>
      <p className="leading-relaxed mb-4">
        Gothic handwriting (also called Gothic script) was for centuries the everyday writing hand in Denmark. It was standard in schools until the school reform around 1875, after which the Latin script took over. That is why virtually all old Danish documents from before 1875 - parish registers, censuses, deeds and private letters - are written with Gothic letters.
      </p>
      <h2 className="font-serif text-xl font-semibold mt-8 mb-3">The Gothic alphabet: the most important letters</h2>
      <p className="leading-relaxed mb-4">
        When you set out to decipher Gothic script, it helps to know the typical letterforms. Many lowercase letters look alike: an <strong>e</strong> often resembles an <strong>n</strong>, and a <strong>u</strong> is distinguished from <strong>n</strong> only by a small arc above it. The long <strong>ſ</strong> can be confused with f and h. The capital letters differ more from today's Latin script. The best advice: print out a Gothic alphabet and keep it beside you while you read.
      </p>
      <h3 className="font-serif text-lg font-semibold mt-6 mb-2">Practical tips for practising</h3>
      <p className="leading-relaxed mb-4">
        Start with short, clear texts: a postcard or a brief passage from a letter. Read word by word, and compare uncertain letters with the alphabet. In difficult spots it helps to guess the word from the context: names, place names and recurring phrases (»Dear...«, »yours affectionately«) come up again and again and make deciphering easier. If you would rather skip the learning curve, you can have your documents deciphered by a service such as <Link href="/">MormorsBreve</Link> - so you get readable text straight away.
      </p>
      <h2 className="font-serif text-xl font-semibold mt-8 mb-3">Remember the old spelling</h2>
      <p className="leading-relaxed mb-4">
        When you decipher Gothic script, you come across the old spelling: before the reform of 1948, people wrote »Aa« instead of »Å«, and every noun began with a capital letter. These are not mistakes, but the correct spelling of the time. Read more in our article on <Link href="/blog/gammel-dansk-retskrivning" className="text-primary hover:underline">old Danish spelling</Link>.
      </p>
      <p className="leading-relaxed mb-4">
        Do you have many pages in Gothic script and little time? With <Link href="/">MormorsBreve</Link> you simply upload photos or scans and get a readable transcription within minutes - free to try for the first pages.
      </p>
    </>
  ),

  "slaegtsforskning-for-begyndere": (
    <>
      <p className="leading-relaxed mb-4">
        Exploring your family tree is like travelling back in time. With a few clicks you can today find your <strong>ancestors</strong> in digitised sources - but sooner or later most people hit the same wall: the <strong>Gothic script</strong>. This guide shows you how to get off to a good start with genealogy, and what to do when the script becomes unreadable.
      </p>
      <h2 className="font-serif text-xl font-semibold mt-8 mb-3">Start with what you know</h2>
      <p className="leading-relaxed mb-4">
        Begin with yourself and work backwards: parents, grandparents, great-grandparents. Note down names, years of birth and places. Ask older family members and look for old papers at home - baptism certificates, letters, diaries. Every name and date is a thread you can follow further back.
      </p>
      <h2 className="font-serif text-xl font-semibold mt-8 mb-3">The most important sources: parish registers and censuses</h2>
      <p className="leading-relaxed mb-4">
        The backbone of Danish genealogy is the <strong>parish registers</strong> (baptisms, marriages, burials) and the <strong>censuses</strong> from 1787 onwards. Most have been digitised and are freely available on the National Archives' Arkivalieronline. The only problem is that the sources from before 1875 are written in Gothic handwriting. Read more about finding your way around them in our article on <Link href="/blog/kirkeboeger-folketaellinger-laese" className="text-primary hover:underline">reading parish registers and censuses</Link>.
      </p>
      <h2 className="font-serif text-xl font-semibold mt-8 mb-3">When the script blocks your way</h2>
      <p className="leading-relaxed mb-4">
        This is where many people get stuck: the source exists, but the Gothic script cannot be deciphered. You can either learn to read the script yourself - see our <Link href="/blog/tyde-gotisk-skrift-guide" className="text-primary hover:underline">guide to deciphering Gothic script</Link> - or you can upload a photo of the page to <Link href="/">MormorsBreve</Link> and get readable text in minutes. Many genealogists use AI to move forward quickly and save their energy for the detective work itself.
      </p>
      <h2 className="font-serif text-xl font-semibold mt-8 mb-3">Save and share your findings</h2>
      <p className="leading-relaxed mb-4">
        Enter your findings into a genealogy program or a simple chart, and always save a reference to the source. That way you - and your descendants - can always find your way back. And remember: behind every name there is a person and a story. A single deciphered letter can tell you more about an ancestor than ten dates.
      </p>
    </>
  ),

  "gammel-dansk-retskrivning": (
    <>
      <p className="leading-relaxed mb-4">
        When you read old Danish documents, you quickly come across spellings that look wrong to modern eyes: <strong>»Aar«</strong> instead of »år« (year), and nouns such as <strong>»Manden«</strong> (the man) and <strong>»Huset«</strong> (the house) written with a capital. These are not mistakes - they are the correct spelling of the time. This article explains the most important differences.
      </p>
      <h2 className="font-serif text-xl font-semibold mt-8 mb-3">»Aa« instead of »Å«</h2>
      <p className="leading-relaxed mb-4">
        The letter <strong>Å</strong> was first officially introduced into Danish with the spelling reform of 1948. Before that, the sound was written with a double a: »Aar« (year), »Maal« (measure/goal), »paa« (on). So when you decipher a text from before 1948, you should expect »Aa« - and a good transcription preserves it, so the text stays true to the original.
      </p>
      <h2 className="font-serif text-xl font-semibold mt-8 mb-3">Nouns with a capital first letter</h2>
      <p className="leading-relaxed mb-4">
        Until the reform of 1948, <strong>all nouns</strong> were written with a capital first letter - just as in German today. »Manden gik over Marken til Kirken« (the man walked across the field to the church) would therefore appear with three capital letters. This is one of the clearest markers that a text is old, and it is important to know, so that you do not misinterpret it as random spelling.
      </p>
      <h2 className="font-serif text-xl font-semibold mt-8 mb-3">The reform of 1948</h2>
      <p className="leading-relaxed mb-4">
        The spelling reform of 1 October 1948 changed written Danish markedly: nouns received a lowercase first letter, »Aa« became »Å«, and a few verb forms were modernised. Texts from before and after therefore look strikingly different - a useful point of reference when you have to date an undated document.
      </p>
      <p className="leading-relaxed mb-4">
        Would you like an old text made readable without having to keep track of the rules yourself? <Link href="/">MormorsBreve</Link> deciphers the Gothic script and preserves the historical spelling - upload a photo and see the first pages for free.
      </p>
    </>
  ),

  "kirkeboeger-folketaellinger-laese": (
    <>
      <p className="leading-relaxed mb-4">
        <strong>Parish registers</strong> and <strong>censuses</strong> are the two most important sources in Danish genealogy. Most have been digitised and are freely available - but they are written in Gothic handwriting, which few people can read today. Here is a practical guide to finding and deciphering them.
      </p>
      <h2 className="font-serif text-xl font-semibold mt-8 mb-3">Parish registers: baptisms, marriages and burials</h2>
      <p className="leading-relaxed mb-4">
        Priests have kept parish registers for centuries. They contain baptisms (with the parents' names and godparents), marriages and burials - gold for the genealogist. The books from before 1875 are written in Gothic script, often with abbreviations and Latin phrases. A single baptism entry can take you a whole generation further back.
      </p>
      <h2 className="font-serif text-xl font-semibold mt-8 mb-3">Censuses: a snapshot of the household</h2>
      <p className="leading-relaxed mb-4">
        The censuses, carried out from 1787 onwards (1801, 1834, 1840 and later), list every person in a household with their age, occupation and relationship to the head of the family. They are wonderful for gathering a family in one place and at one point in time - but the oldest are likewise in Gothic handwriting.
      </p>
      <h2 className="font-serif text-xl font-semibold mt-8 mb-3">How to find them on Arkivalieronline</h2>
      <p className="leading-relaxed mb-4">
        The National Archives' Arkivalieronline gives free access to the digitised sources. You typically navigate by parish and year. Once you have found the right page, you can take a screenshot or download the image - and if the script gives you trouble, upload it to <Link href="/">MormorsBreve</Link> for readable text.
      </p>
      <h2 className="font-serif text-xl font-semibold mt-8 mb-3">When the Gothic script gives you trouble</h2>
      <p className="leading-relaxed mb-4">
        Even experienced genealogists spend time deciphering difficult hands. Learn to do it yourself with our <Link href="/blog/tyde-gotisk-skrift-guide" className="text-primary hover:underline">guide to Gothic script</Link>, or let AI handle the deciphering so you can concentrate on building the family tree. If you are completely new, start with <Link href="/blog/slaegtsforskning-for-begyndere" className="text-primary hover:underline">genealogy for beginners</Link>.
      </p>
    </>
  ),

  "udvandrerbreve-historie": (
    <>
      <p className="leading-relaxed mb-4">
        Between 1860 and 1920 more than <strong>300,000 Danes</strong> left their homeland to seek their fortune in the USA. The letters they wrote home are among the most moving testimonies a family can own - but they are often written in Gothic script that the descendants today cannot read.
      </p>
      <h2 className="font-serif text-xl font-semibold mt-8 mb-3">The great emigration</h2>
      <p className="leading-relaxed mb-4">
        From Southern Jutland and western Jutland in particular, thousands of Danes sailed across the Atlantic. For most it was a farewell forever. The letter became the lifeline between two worlds: families waited weeks and months for news from Chicago, Iowa or Nebraska, and the letters were read aloud and kept like treasures.
      </p>
      <h2 className="font-serif text-xl font-semibold mt-8 mb-3">What the letters tell us</h2>
      <p className="leading-relaxed mb-4">
        The emigrant letters hold whole lives: the dream of land and work, homesickness, the joy of a newborn child, the grief of a death far away. They often mix Danish with the odd English word that the emigrant had picked up. For today's reader they are a direct window into a forebear's innermost thoughts.
      </p>
      <h2 className="font-serif text-xl font-semibold mt-8 mb-3">Make the letters readable again</h2>
      <p className="leading-relaxed mb-4">
        The letters are written in the Gothic handwriting that the emigrants learned at school before 1875. With <Link href="/">MormorsBreve</Link> you can upload a photo and have the text made readable in minutes - and translated into English, so the American descendants can read along too. Read also our page on <Link href="/udvandrerbreve-fra-amerika" className="text-primary hover:underline">emigrant letters from America</Link>.
      </p>
      <p className="leading-relaxed mb-4">
        A single deciphered letter can change a family's sense of itself. Pass the story on, before the script slips into oblivion for good.
      </p>
    </>
  ),

  "oversaet-gamle-breve": (
    <>
      <p className="leading-relaxed mb-4">
        An old letter in <strong>Gothic script</strong> can feel like a locked door. You can hold it in your hand, but not read what it says. This article explains how to have old letters deciphered - and translated, if the family is spread across the world.
      </p>
      <h2 className="font-serif text-xl font-semibold mt-8 mb-3">First decipher, then understand</h2>
      <p className="leading-relaxed mb-4">
        Making an old letter readable happens in two steps. First the Gothic script is deciphered into letters we can read today. Then the text can be translated - for example from old Danish into modern Danish, or into an entirely different language. MormorsBreve does both in the same workflow.
      </p>
      <h2 className="font-serif text-xl font-semibold mt-8 mb-3">Three versions for different purposes</h2>
      <p className="leading-relaxed mb-4">
        You get the text in three versions: true to the original (good for genealogy), AI-supplemented (gaps filled in sensibly) and free interpretation (fluent modern Danish, good for reading aloud). So you decide for yourself how close to the original you want to be.
      </p>
      <h2 className="font-serif text-xl font-semibold mt-8 mb-3">Translation for family abroad</h2>
      <p className="leading-relaxed mb-4">
        If there are relatives abroad - for example descendants of <Link href="/blog/udvandrerbreve-historie" className="text-primary hover:underline">Danish emigrants in America</Link> - the text can be translated into English or over 30 other languages, at no extra cost. So the whole family can read along, wherever they live.
      </p>
      <p className="leading-relaxed mb-4">
        Upload a photo of the letter to <Link href="/">MormorsBreve</Link> and see the first pages for free. If the Gothic script gives you trouble, start with our <Link href="/blog/tyde-gotisk-skrift-guide" className="text-primary hover:underline">guide to deciphering Gothic script</Link>.
      </p>
    </>
  ),

  "soenderjylland-familiehistorie": (
    <>
      <p className="leading-relaxed mb-4">
        Few places in Denmark have a family history as dramatic as <strong>Southern Jutland</strong>. From the defeat of 1864 to the Reunification of 1920, families in Southern Jutland lived between two countries - and their experiences are found in letters and diaries written in Gothic script, which many descendants have tucked away.
      </p>
      <h2 className="font-serif text-xl font-semibold mt-8 mb-3">A region under foreign rule</h2>
      <p className="leading-relaxed mb-4">
        The defeat of 1864 cost Denmark Southern Jutland, and for more than half a century Danish Southern Jutlanders lived under German rule. The language of school and administration became German, while many held on to Danish within the walls of their homes. It left deep marks on the families - and in their letters.
      </p>
      <h2 className="font-serif text-xl font-semibold mt-8 mb-3">Letters across a border</h2>
      <p className="leading-relaxed mb-4">
        Family documents from Southern Jutland from this period are often in Gothic handwriting, which was common to both the Danish and the German school tradition. Some letters are in Danish, others in German, and many switch between the languages. Young men from Southern Jutland were conscripted into the German army and wrote home from the front during the First World War.
      </p>
      <h2 className="font-serif text-xl font-semibold mt-8 mb-3">The Reunification of 1920</h2>
      <p className="leading-relaxed mb-4">
        When the Reunification came in 1920, it was the culmination of generations of hope. A deciphered letter or diary from the period can show how a family experienced the border, the war and the reunification - seen from the inside, in the words of ordinary people.
      </p>
      <p className="leading-relaxed mb-4">
        With <Link href="/">MormorsBreve</Link> you can have documents from Southern Jutland deciphered, whether they are in Danish or German, and translated so the whole family can read along. See also our page on <Link href="/soenderjylland-1864-genforeningen" className="text-primary hover:underline">Southern Jutland 1864-1920</Link>.
      </p>
    </>
  ),

  "gamle-maal-og-forkortelser": (
    <>
      <p className="leading-relaxed mb-4">
        When you decipher an old <strong>cookbook</strong> or an old document, the Gothic script is only one challenge. The other is the <strong>old measures and abbreviations</strong> that nobody uses any more. This article helps you understand them.
      </p>
      <h2 className="font-serif text-xl font-semibold mt-8 mb-3">Old Danish measures</h2>
      <p className="leading-relaxed mb-4">
        Before the metric system, people used measures such as <strong>pund</strong> (a pound, about 500 g), <strong>lod</strong> (about 15 g), <strong>kvint</strong> and <strong>pægl</strong> (a liquid measure, about 0.24 litres). Recipes often say »et halvt Pund Smør« (half a pound of butter) or »en Pægl Fløde« (a pægl of cream). Knowing the conversions is essential if you want to bake grandmother's cake from the original.
      </p>
      <h2 className="font-serif text-xl font-semibold mt-8 mb-3">Typical abbreviations</h2>
      <p className="leading-relaxed mb-4">
        Because whoever wrote it down did so for themselves, old recipes teem with abbreviations that are never explained: »Spsk.« for tablespoon, »tsk.« for teaspoon, »Pd.« for pound. Quantities are often loose - »to taste« or »as usual« appears where today there would be a precise instruction.
      </p>
      <h2 className="font-serif text-xl font-semibold mt-8 mb-3">More than food</h2>
      <p className="leading-relaxed mb-4">
        A handwritten cookbook is often also a family chronicle, with notes, dates and greetings between the recipes. Read more on our page about <Link href="/gamle-opskrifter-tyde" className="text-primary hover:underline">deciphering old recipes</Link>.
      </p>
      <p className="leading-relaxed mb-4">
        Would you like grandmother's cookbook made readable? <Link href="/">MormorsBreve</Link> deciphers the Gothic script, so the recipes come back to the kitchen table - upload a photo and try the first pages for free.
      </p>
    </>
  ),

};
