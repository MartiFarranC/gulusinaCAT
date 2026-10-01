/** Pantalla amb la gota que tapa la pàgina fins que les dades són a punt. */

const DURADA_DE_LA_SORTIDA_MS = 350;

export class PantallaDeCarrega {
  /**
   * @param {HTMLElement} pantalla
   * @param {boolean} movimentReduit
   */
  constructor(pantalla, movimentReduit) {
    this.pantalla = pantalla;
    this.movimentReduit = movimentReduit;
  }

  /** Destapa la pàgina; la pantalla s'esvaeix i després es treu. */
  amaga() {
    document.body.removeAttribute("aria-busy");
    if (this.movimentReduit) {
      this.pantalla.remove();
      return;
    }
    this.pantalla.classList.add("surt");
    setTimeout(() => this.pantalla.remove(), DURADA_DE_LA_SORTIDA_MS);
  }
}
