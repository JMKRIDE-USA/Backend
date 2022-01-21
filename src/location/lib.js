const { googleMapsApiKey } = require('../environment.js');
const { Client } = require("@googlemaps/google-maps-services-js");

const client = new Client({});

exports.lookupLocation = async ({country, zip, extraStrings}) => {
  return client.geocode({params: {
    key: googleMapsApiKey,
    address: country + " zip code " + zip + (extraStrings ? (" " + extraStrings) : "")
  }}).then(result => {
    let corrected_country;
    result.data.results[0].address_components.forEach(
      ({long_name, types}) => {if(types.includes('country')) corrected_country = long_name}
    )
    console.log({corrected_country})
    return result.data.results.map(l => ({country: corrected_country, zip, bounds: l.geometry.bounds, ...l.geometry.location}))})
};
