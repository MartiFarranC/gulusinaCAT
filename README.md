# On omplo el dipòsit?

Compara el preu mitjà de la gasolina 95 i el dièsel a bonÀrea, Esclatoil,
Petrocat i Repsol a Catalunya, amb dades oficials del Ministeri.

## Com obté els preus

Cada vegada que algú obre la pàgina:

1. Demana els preus d'avui directament al Ministeri.
2. Si el navegador no ho permet o el Ministeri no respon, llegeix `preus.json`,
   una còpia que GitHub Actions actualitza cada mitja hora.
3. Si tampoc hi és, mostra els preus que porta la pàgina de fàbrica.

A sota del selector de combustible s'indica quina de les tres fonts s'està fent servir.

## Com penjar-la a GitHub Pages

1. Crea un repositori nou i puja-hi tots aquests fitxers, inclosa la carpeta `.github`.
2. A **Settings → Pages**, a *Source* tria **Deploy from a branch**, branca `main`, carpeta `/ (root)`.
3. A **Settings → Actions → General**, a *Workflow permissions*, marca **Read and write permissions**.
4. A la pestanya **Actions**, obre *Actualitza preus* i prem **Run workflow** perquè es creï el primer `preus.json`.

La pàgina quedarà a `https://<el-teu-usuari>.github.io/<nom-del-repositori>/`.
