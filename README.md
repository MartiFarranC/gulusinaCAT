# On omplo el dipòsit?

Compara el preu mitjà de la gasolina 95 i el dièsel de totes les marques de
benzineres de Catalunya, amb dades oficials del Ministeri.

## Com obté els preus

Cada vegada que algú obre la pàgina:

1. Demana els preus d'avui directament al Ministeri.
2. Si el navegador no ho permet o el Ministeri no respon, llegeix `preus.json`,
   una còpia que GitHub Actions actualitza cada mitja hora.
3. Si tampoc hi és, mostra els preus que porta la pàgina de fàbrica.

A sota del selector de combustible s'indica quina de les tres fonts s'està fent servir.
Si les dades tenen més d'un dia, també ho diu.

## Històric

Cada vegada que s'executa, el workflow desa l'última mitjana del dia a `historic.json`
(un any com a màxim). La pàgina en treu la tendència de cada marca respecte al dia
anterior i un gràfic dels últims 30 dies.

Per omplir dies passats amb l'històric del Ministeri: a **Actions → Actualitza preus →
Run workflow**, posa a *dies_enrere* quants dies vols recuperar (per exemple, 30).

## Com penjar-la a GitHub Pages

1. Crea un repositori nou i puja-hi tots aquests fitxers, inclosa la carpeta `.github`.
2. A **Settings → Pages**, a *Source* tria **Deploy from a branch**, branca `main`, carpeta `/ (root)`.
3. A **Settings → Actions → General**, a *Workflow permissions*, marca **Read and write permissions**.
4. A la pestanya **Actions**, obre *Actualitza preus* i prem **Run workflow** perquè es creï el primer `preus.json`.

La pàgina quedarà a `https://<el-teu-usuari>.github.io/<nom-del-repositori>/`.

## Deu anys de preus

`historic_anual.py` (workflow *Històric de 10 anys*, cada dia a les 3:17 UTC) omple
`anual.json` amb el preu mitjà de cada marca i de tot Catalunya des de fa 10 anys.
Per a cada mes agafa el dia 15 de l'històric del Ministeri, i la mitjana de l'any és
la dels seus mesos. Cada execució demana com a màxim 30 mesos que faltin, perquè el
servidor del Ministeri talla sovint la connexió: en pocs dies queda complet.

## Com es reconeixen les marques

`actualitza_preus.py` (llista `CONEGUDES`) reconeix les cadenes habituals pel rètol:
Repsol, Moeve (Cepsa), Galp, BP, Shell, Plenoil, Ballenoil, Petroprix, bonÀrea,
Esclatoil, Petrocat, Petromiralles, supermercats… Qualsevol altre rètol que es repeteixi
en 3 o més benzineres també compta com a marca. La resta (independents i marques amb
menys de 3 benzineres) s'agrupa a «Independents i altres». El registre del workflow
mostra els rètols més repetits que han anat a aquest grup, per si cal afegir-ne cap.

## Les més properes

L'interruptor «Les més properes» compara només les benzineres que hi ha dins d'un radi
(50 km per defecte, de 5 a 150 km). La ubicació surt del GPS del mòbil (el navegador en
demana permís) o d'un municipi escrit a mà. La llista de municipis surt de les mateixes
dades del Ministeri, així que no cal cap servei extern. Les dades de cada benzinera són
a `estacions.json`, que genera el mateix workflow.

## Filtre de marques

El botó «Marques» obre una llista amb totes les marques per triar quines es comparen
(amb cercador i botons «Totes» / «Cap»). El filtre afecta els rètols, el rànquing, la
calculadora, el rètol que llisca i la llista de benzineres properes. La mitjana de
referència sempre es calcula amb totes les benzineres. El navegador recorda el filtre.
