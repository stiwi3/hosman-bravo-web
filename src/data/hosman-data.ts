// Datos editables de Hosman Bravo
// Actualiza este archivo para cambiar el contenido del sitio

// Prefijo de rutas cuando el sitio se publica en un subdirectorio
// (ej: stiwi3.github.io/hosman-bravo-web). Vacío en desarrollo local.
const bp = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

export const hosmanData = {
  // Prefijo de despliegue para assets que no son imágenes (vídeos, descargas).
  // Las rutas de `images` ya lo llevan aplicado.
  basePath: bp,

  // Información personal
  artist: {
    name: 'HOSMAN BRAVO',
    fullName: 'Hosman Jefersson Otálora Bernal',
    age: 31,
    birthPlace: 'Santa María, Boyacá',
    currentCity: 'Medellín, Antioquia',
    tagline: 'El Rey de los Caballos',
    genre: 'Música Popular y Regional Mexicana',
    bio: 'Cantautor colombiano nacido en Santa María, Boyacá, criado entre la tradición campesina y el amor profundo por los caballos. Radicado en Medellín, ha construido una propuesta artística única en Colombia: la fusión entre la música popular y regional — con una voz que transmite con igual fuerza el desamor y la celebración — y el espectáculo ecuestre de alta escuela bajo doma racional y etológica.',
    bioShort: 'Cantautor colombiano · Doma racional y alta escuela ecuestre · Shows en vivo únicos · Medellín 🇨🇴🐎'
  },

  // Caballos
  horses: [
    {
      name: 'Don Juan',
      description: 'Caballo español',
      role: 'Figura principal del show. Protagonista de la alta escuela en vivo.',
      color: 'Castaño'
    },
    {
      name: 'Bandolero',
      description: 'Caballo blanco',
      role: 'Nuevo integrante. En incorporación al show.',
      color: 'Blanco'
    },
    {
      name: 'Triunfador',
      description: 'Caballo criollo colombiano',
      role: 'Retirado del show. Vive en retiro digno. Historia emocional poderosa.',
      color: 'Criollo'
    }
  ],

  // Información comercial
  shows: {
    currentFrequency: '1-2 shows/mes',
    goal2026: '3-4 shows/mes',
    cache: {
      withoutBand: '$6.000.000 COP',
      withBand: '$9.000.000 COP',
      duration: '1h 20m',
      location: 'Medellín'
    }
  },

  // Redes sociales
  socialLinks: {
    instagram: 'https://www.instagram.com/hosmanbravo/',
    tiktok: 'https://www.tiktok.com/@hosman_bravo',
    youtube: 'https://www.youtube.com/@hosmanbravo',
    facebook: 'https://www.facebook.com/hosman.bravo/',
    whatsapp:
      'https://api.whatsapp.com/send/?phone=573225129515&text&type=phone_number&app_absent=0',
    spotify: 'https://open.spotify.com/intl-es/artist/5IZ9yQEhRQ3rTq76sm93R3',
    soundcloud: 'https://soundcloud.com/hosmanbravo'
  },

  // Canción de entrada: suena al pulsar el acceso y alimentará al reproductor.
  // El nombre del archivo lleva tilde, así que la ruta va codificada para que
  // resuelva igual en el export estático de GitHub Pages.
  featuredTrack: {
    title: 'Tomando Trago',
    audio: `${bp}/audio/Canci%C3%B3n-entrada.mp3`,
    youtubeUrl: 'https://www.youtube.com/watch?v=wOtsMOie4bw',
    spotifyUrl: 'https://open.spotify.com/track/2uVmWqSks9Cf9ULXYPWJi0'
  },

  // Plataformas de streaming, en orden de importancia.
  // El campo `icon` corresponde a un componente de PlatformIcons.tsx.
  musicPlatforms: [
    {
      name: 'Spotify',
      icon: 'spotify',
      url: 'https://open.spotify.com/intl-es/artist/5IZ9yQEhRQ3rTq76sm93R3?si=1HDm4sFvRyyLYh7r4oGpAA'
    },
    {
      name: 'Apple Music',
      icon: 'appleMusic',
      url: 'https://music.apple.com/us/artist/hosman-bravo/1635792181'
    },
    {
      name: 'YouTube Music',
      icon: 'youtubeMusic',
      url: 'https://music.youtube.com/@hosmanbravo?si=cxOu4FUOmtNmHCwA'
    },
    {
      name: 'Amazon Music',
      icon: 'amazonMusic',
      url: 'https://amazon.es/music/player/artists/B0B7F282KC/hosman-bravo?marketplaceId=A1RKKUPIHCS9HS&musicTerritory=ES&ref=dm_sh_GuaMd3i9M4lCmCCttYIOb6T2d'
    },
    {
      name: 'Deezer',
      icon: 'deezer',
      url: 'https://www.deezer.com/es/artist/177325857'
    },
    {
      name: 'Tidal',
      icon: 'tidal',
      url: 'https://tidal.com/artist/33378552/u'
    },
    {
      name: 'SoundCloud',
      icon: 'soundCloud',
      url: 'https://soundcloud.com/hosmanbravo'
    },
    {
      name: 'Audiomack',
      icon: 'audiomack',
      url: 'https://audiomack.com/hosman-bravo'
    }
  ] as const,

  // Información de contacto
  contact: {
    email: 'contacto@hosmanbravo.com',
    whatsapp: '+57 (your number)',
    managerEmail: 'danny@hosmanbravo.com'
  },

  // Estadísticas de redes (actualizadas manualmente)
  socialStats: {
    instagram: '19.4K',
    tiktok: '21K',
    youtube: '977',
    facebook: '616',
    spotify: '72/mes'
  },

  // Colores personalizados
  colors: {
    primary: '#c81d25', // Rojo
    dark: '#060405',    // Negro muy oscuro
    darkRed: '#4a0d10', // Rojo oscuro para gradientes
    white: '#f5f5f5'
  },

  // Imágenes del sitio (rutas en /public)
  images: {
    logo: {
      imagotipoDorado: `${bp}/images/logo/imagotipo-dorado.png`,
      imagotipoBlanco: `${bp}/images/logo/imagotipo-blanco.png`,
      isotipoDorado: `${bp}/images/logo/isotipo-dorado.png`,
      isotipoBlanco: `${bp}/images/logo/isotipo-blanco.png`,
      // Isotipo tallado en cuero, para el hueco circular de la cabecera del
      // menú: ahí el fondo dorado plano del isotipo normal desentonaba con el
      // material de la pieza.
      isotipoCuero: `${bp}/images/logo/isotipo-cuero.png`,
      logotipoDorado: `${bp}/images/logo/logotipo-dorado.png`,
      logotipoBlanco: `${bp}/images/logo/logotipo-blanco.png`
    },
    // Grano real de cuero negro, usado como material de las piezas del menú
    // (no como fondo plano); ver `LeatherMenu`.
    //
    // `black-leather-matte.webp` es la original pasada por una curva de tono
    // calcada del perfil de `public/references/menu-reference.png`: mismo medio
    // y mismo grano, pero con el extremo especular aplastado (149 -> 86), que
    // era lo que hacía que el cuero se leyera satinado en vez de mate. La
    // original se conserva por si hiciera falta rederivarla.
    textures: {
      blackLeather: `${bp}/images/textures/black-leather-matte.webp`,
      blackLeatherRaw: `${bp}/images/textures/black-leather.webp`
    },
    hero: `${bp}/images/show-01.jpg`,
    // Rótulo transparente que se superpone al vídeo del hero (tira 3:1).
    heroLetters: `${bp}/images/Letras sin fondo.png`,
    about: `${bp}/images/hosman-donjuan.jpg`,
    aboutSecondary: `${bp}/images/hosman-bandolero.jpg`,
    shows: [
      `${bp}/images/show-01.jpg`,
      `${bp}/images/show-02.jpg`,
      `${bp}/images/show-03.jpg`,
      `${bp}/images/show-04.jpg`
    ],
    galeria: [
      `${bp}/images/galeria/galeria-01.jpg`,
      `${bp}/images/galeria/galeria-02.jpg`,
      `${bp}/images/galeria/galeria-03.jpg`,
      `${bp}/images/galeria/galeria-04.jpg`,
      `${bp}/images/galeria/galeria-05.jpg`,
      `${bp}/images/galeria/galeria-06.jpg`,
      `${bp}/images/galeria/galeria-07.jpg`,
      `${bp}/images/galeria/galeria-08.jpg`,
      `${bp}/images/galeria/galeria-09.jpg`,
      `${bp}/images/galeria/galeria-10.jpg`,
      `${bp}/images/galeria/galeria-11.jpg`,
      `${bp}/images/galeria/galeria-12.jpg`,
      `${bp}/images/galeria/galeria-13.jpg`,
      `${bp}/images/galeria/galeria-14.jpg`
    ]
  },

  // Canciones (editables)
  songs: [
    { title: 'Borracho Todavía', year: 2026 },
    { title: 'Ranchero Genuino', year: 2025 },
    { title: 'Ya Perdiste', year: 2024 },
    { title: 'No Lo Decidí', year: 2024 },
    { title: 'Una Botella', year: 2022 },
    { title: 'El Circo de Tu Amor', year: 2022 }
  ]
}
