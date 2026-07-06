// Datos editables de Hosman Bravo
// Actualiza este archivo para cambiar el contenido del sitio

export const hosmanData = {
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
    spotify: 'https://open.spotify.com/intl-es/artist/5IZ9yQEhRQ3rTq76sm93R3',
    soundcloud: 'https://soundcloud.com/hosmanbravo'
  },

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
      imagotipoDorado: '/images/logo/imagotipo-dorado.png',
      imagotipoBlanco: '/images/logo/imagotipo-blanco.png',
      isotipoDorado: '/images/logo/isotipo-dorado.png',
      isotipoBlanco: '/images/logo/isotipo-blanco.png',
      logotipoDorado: '/images/logo/logotipo-dorado.png',
      logotipoBlanco: '/images/logo/logotipo-blanco.png'
    },
    hero: '/images/show-01.jpg',
    about: '/images/hosman-donjuan.jpg',
    aboutSecondary: '/images/hosman-bandolero.jpg',
    shows: [
      '/images/show-01.jpg',
      '/images/show-02.jpg',
      '/images/show-03.jpg',
      '/images/show-04.jpg'
    ],
    galeria: [
      '/images/galeria/galeria-01.jpg',
      '/images/galeria/galeria-02.jpg',
      '/images/galeria/galeria-03.jpg',
      '/images/galeria/galeria-04.jpg',
      '/images/galeria/galeria-05.jpg',
      '/images/galeria/galeria-06.jpg',
      '/images/galeria/galeria-07.jpg',
      '/images/galeria/galeria-08.jpg',
      '/images/galeria/galeria-09.jpg',
      '/images/galeria/galeria-10.jpg',
      '/images/galeria/galeria-11.jpg',
      '/images/galeria/galeria-12.jpg',
      '/images/galeria/galeria-13.jpg',
      '/images/galeria/galeria-14.jpg'
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
