import fs from 'fs';

async function listCollections() {
  const url = "https://catalogue.dataspace.copernicus.eu/stac/collections";
  const res = await fetch(url);
  console.log("Collections status:", res.status);
  const data = await res.json();
  if (data.collections) {
    console.log("Available STAC collections:");
    data.collections.forEach(c => console.log(` - ID: "${c.id}" (Title: ${c.title})`));
  } else {
    console.log("Response:", data);
  }
}

listCollections();
