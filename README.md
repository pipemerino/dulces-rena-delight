# Dulces Rena Delight

Quiero que rediseñes/mejores la interfaz de una app web llamada "Dulces Rena" (título interno: "Entregas de dulces"). Es una app para un negocio casero de venta de dulces (cuchuflí, galletas, mini donas, alfajores) que se entregan en consignación a una tienda. La usan dos tipos de personas:

1. La dueña (uno o dos correos con acceso total): registra entregas, ve un resumen mensual, atiende avisos de faltantes y configura precios/productos.

2. Las cajeras de la tienda: entran por un link especial SIN iniciar sesión (login anónimo invisible) y solo ven una pantalla súper simple para avisar qué dulce se está acabando.

Identidad de marca (ya definida, mantenla):

- Logo: texto "Dulces" en café oscuro y "Rena" en rosa fuerte, apiladas, con un ícono de dona sonriente al lado, sobre fondo rosa pálido con dulces difuminados de fondo (cuchuflí, alfajores, galletas, mini donas).

- Colores: fondo crema #FFF7F9, superficie #FFFFFF, texto principal (café) #3B2316, texto secundario #8C7065, líneas #F1DCE4, acento/rosa fuerte para botones y CTAs #D94F7E, rosa pálido de marca #FAD7DC (para fondos suaves, insignias, tarjetas — no para texto ni botones porque pierde contraste), verde de éxito #2F8551, naranjo de advertencia #C9701C.

- Tipografías: Bricolage Grotesque para títulos (bold, redondeada, con carácter), Figtree para texto de cuerpo.

- Estilo: cálido, tipo pastelería/dulcería, amigable y apetitoso, no infantil. Mobile-first (se usa principalmente desde el celular).

Pantallas que debe tener (mantén esta estructura funcional, solo mejora el diseño visual):

- Login con Google (para la dueña).

- Vista de la dueña con pestañas: "Entregas" (formulario para registrar una entrega: cantidad y precio por producto, con un "ticket" que calcula el total automáticamente, fecha, nota, y si ya le pagaron o cuánto le pagaron si fue parcial), "Resumen del mes" (total entregado, cobrado vs por cobrar, gráfico de barras por producto, gráfico de barras por día, ranking de qué dulce se avisa más como faltante), "Avisos" (lista de avisos pendientes/atendidos que mandan las cajeras), "Ajustes" (precios, nombre de tienda, lista de trabajadoras, canal de notificaciones, número de WhatsApp).

- Vista de cajera (sin login): grid grande de botones, uno por cada dulce, con badge si ya hay un aviso pendiente de ese producto; al tocar uno, un formulario mínimo con nota opcional y botón "Enviar aviso"; después de enviar, confirmación con opción de reenviar el aviso también por WhatsApp.

Lo que quiero mejorar específicamente: eleva el diseño visual general (jerarquía, espaciados, micro-interacciones, estados vacíos, tarjetas y componentes), sin perder la simplicidad — la pantalla de las cajeras en particular tiene que seguir siendo utilizable por alguien sin ninguna experiencia técnica, en 2-3 toques como máximo. Usa el logo y la paleta de colores de arriba de forma consistente en toda la app, en modo claro y oscuro.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/72f0658c-2bc1-527c-8266-345e466a62fd).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
