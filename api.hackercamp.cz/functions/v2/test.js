export async function onRequestGet(context) {
  console.log(context);
  return new Response("ok");
}
