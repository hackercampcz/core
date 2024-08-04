export async function onRequestGet(context) {
  console.dir(context);
  return new Response("ok");
}
