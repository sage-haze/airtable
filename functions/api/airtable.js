export async function onRequestGet({ env }) {
  const { AIRTABLE_TOKEN, AIRTABLE_BASE_ID, AIRTABLE_TABLE_NAME } = env;

  if (!AIRTABLE_TOKEN || !AIRTABLE_BASE_ID || !AIRTABLE_TABLE_NAME) {
    return Response.json(
      {
        error:
          "Missing AIRTABLE_TOKEN, AIRTABLE_BASE_ID, or AIRTABLE_TABLE_NAME.",
      },
      { status: 500 }
    );
  }

  const airtableUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(
    AIRTABLE_TABLE_NAME
  )}`;

  const airtableResponse = await fetch(airtableUrl, {
    headers: {
      Authorization: `Bearer ${AIRTABLE_TOKEN}`,
    },
  });

  const data = await airtableResponse.json();

  if (!airtableResponse.ok) {
    return Response.json(
      {
        error: "Airtable request failed.",
        details: data,
      },
      { status: airtableResponse.status }
    );
  }

  return Response.json(data);
}
