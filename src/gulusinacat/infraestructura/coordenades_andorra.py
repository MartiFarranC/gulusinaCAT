"""On és cada benzinera d'Andorra, per l'identificador que fa servir el web del Govern.

El Govern no publica les coordenades. Aquestes són les de les benzineres d'OpenStreetMap
(© col·laboradors d'OpenStreetMap, ODbL), aparellades a mà per marca, adreça i nucli.
Les marcades com a aproximades no tenen cap punt a OpenStreetMap: són el centre del nucli.
Una benzinera nova que no hi sigui surt als preus però no al mapa fins que s'afegeixi aquí.
"""

from __future__ import annotations

COORDENADES: dict[int, tuple[float, float]] = {
    1: (42.53349, 1.58471),  # Repsol Encamp
    2: (42.50833, 1.54505),  # Repsol Escaldes
    4: (42.49705, 1.50204),  # Repsol Sta. Coloma (aproximada: Av. d'Enclar)
    6: (42.45503, 1.48697),  # Shell Sant Julià
    7: (42.53300, 1.57900),  # Shell Encamp (aproximada: la Bartra)
    9: (42.49726, 1.50206),  # Shell Santa Coloma
    10: (42.57950, 1.64900),  # Shell Tarter (aproximada: el Tarter)
    14: (42.45510, 1.48636),  # MEROIL River
    15: (42.54666, 1.73066),  # Gasopas
    16: (42.47681, 1.49080),  # TotalEnergies Aixovall
    17: (42.56699, 1.60083),  # TotalEnergies Canillo
    18: (42.49688, 1.50131),  # TotalEnergies El Cedre
    19: (42.45360, 1.48739),  # TotalEnergies La Riberola
    20: (42.53665, 1.52025),  # TotalEnergies La Massana I
    21: (42.53626, 1.52103),  # TotalEnergies La Massana II
    22: (42.53950, 1.72073),  # TotalEnergies Port d'Envalira
    23: (42.45736, 1.48681),  # TotalEnergies Sant Eloi
    24: (42.49755, 1.50347),  # TotalEnergies Santa Coloma
    26: (42.54008, 1.72025),  # TotalEnergies Pic Blanc
    27: (42.48494, 1.49233),  # TotalEnergies La Margineda
    28: (42.49621, 1.49994),  # Elf Santa Coloma
    29: (42.53482, 1.58116),  # Dyneff Encamp Centre (aproximada: Av. de Joan Martí)
    30: (42.49624, 1.50662),  # Cepsa l'Obac
    31: (42.57700, 1.66800),  # Dyneff Envalira-Soldeu (aproximada: Soldeu)
    32: (42.54959, 1.52435),  # Meroil Ordino
    33: (42.50674, 1.52467),  # Cepsa Auto-Centre
    34: (42.55005, 1.51108),  # Meroil La Massana
    36: (42.53182, 1.57700),  # Cepsa Encamp - La Bartra
    37: (42.50467, 1.52432),  # Cepsa Oros Avda. Tarragona
    38: (42.53997, 1.71951),  # Dyneff Port Envalira
    39: (42.47414, 1.49102),  # Elf Aixovall
    41: (42.49797, 1.50382),  # TotalEnergies Pirineu 1
    43: (42.51055, 1.54826),  # TotalEnergies Artal 2
    44: (42.50812, 1.53973),  # TotalEnergies Artal 1
    46: (42.56596, 1.59615),  # TotalEnergies Tarrado
    49: (42.49899, 1.50557),  # Arap BP
    50: (42.49899, 1.50557),  # Arap BP II
    51: (42.54467, 1.51575),  # Arap BP IV
    52: (42.53352, 1.58582),  # Arap BP V
    53: (42.58188, 1.66204),  # Arap BP VI
    54: (42.55912, 1.58939),  # Arap BP VII
    55: (42.45883, 1.48806),  # Arap BP IX
    57: (42.57958, 1.64006),  # BP Sant Marc
    59: (42.53666, 1.58923),  # BP Encamp Centre I
    60: (42.54220, 1.59142),  # BP Encamp Centre II
    63: (42.46012, 1.48909),  # Cepsa Fontaneda
    64: (42.53143, 1.57697),  # Cepsa Encamp - Nou vial
    65: (42.53189, 1.57694),  # Dyneff Vial Encamp
    67: (42.45289, 1.48728),  # BP Sant Marc II
    71: (42.50502, 1.51526),  # Andorracing Experience
    72: (42.49000, 1.49440),  # Repsol Pont de Madrid
    73: (42.45296, 1.48678),  # Cepsa River
    74: (42.56030, 1.68430),  # Repsol Soldeu
    75: (42.46855, 1.49248),  # Arap BP III
}
