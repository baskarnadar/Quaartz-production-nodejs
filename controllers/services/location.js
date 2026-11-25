// controllers/services/location.js
// Resolves a CountryID / CityID pair against tblcountry / tblcity and returns
// the fields that are stored on tblreginfo and tblpushtoken.

const clean = (v) => (v === undefined || v === null ? "" : String(v).trim());

/**
 * @returns {Promise<{ok:boolean, message?:string, fields:object}>}
 *  fields = { RegCountryID, RegCountryName, RegArCountryName, RegCityID, RegCityName, RegArCityName }
 *  When nothing was sent, ok=true and fields is {}.
 */
async function resolveCountryCity(db, CountryIDRaw, CityIDRaw) {
  const CountryID = clean(CountryIDRaw);
  const CityID = clean(CityIDRaw);

  if (!CountryID && !CityID) return { ok: true, fields: {} };

  let country = null;
  if (CountryID) {
    country = await db.collection("tblcountry").findOne({ CountryID });
    if (!country) return { ok: false, message: "Selected country was not found.", fields: {} };
  }

  let city = null;
  if (CityID) {
    city = await db.collection("tblcity").findOne({ CityID });
    if (!city) return { ok: false, message: "Selected city was not found.", fields: {} };

    if (country && city.CountryID && city.CountryID !== country.CountryID) {
      return { ok: false, message: "Selected city does not belong to the selected country.", fields: {} };
    }
    // city sent without a country -> take the city's country
    if (!country && city.CountryID) {
      country = await db.collection("tblcountry").findOne({ CountryID: city.CountryID });
    }
  }

  const fields = {};
  if (country) {
    fields.RegCountryID = country.CountryID;
    fields.RegCountryName = clean(country.EnCountryName);
    fields.RegArCountryName = clean(country.ArCountryName);
  }
  if (city) {
    fields.RegCityID = city.CityID;
    fields.RegCityName = clean(city.EnCityName);
    fields.RegArCityName = clean(city.ArCityName);
  }
  return { ok: true, fields };
}

module.exports = { resolveCountryCity };
