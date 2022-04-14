const dotenv = require('dotenv').config();
const router = require("express").Router();
const cheerio = require('cheerio');
const HttpsProxyAgent = require('https-proxy-agent');
const {Client} = require("@googlemaps/google-maps-services-js");
const res = require('express/lib/response');
const axios = require('axios');

async function proxyGenerator () {
  let ip_addresses = [];
  let port_numbers = [];
  const axios = require('axios');
  const {data} = await axios.get("https://sslproxies.org/") 
  const $ = cheerio.load(data);

  $("td:nth-child(1)").each(function(index, value) {
    ip_addresses[index] = $(this).text();
  });

  $("td:nth-child(2)").each(function(index, value) {
    port_numbers[index] = $(this).text();
  });

  const random_number = Math.floor(Math.random() * 100);
  const proxy = `http://${ip_addresses[random_number]}:${port_numbers[random_number]}`;
  console.log("new proxy: " + proxy);
  return proxy;
};

async function fetchHTML(url) {
  // const proxyURL = await proxyGenerator();
  // const axiosDefaultConfig = {
  //   baseURL: url,
  //   proxy: false,
  //   httpsAgent: new HttpsProxyAgent(proxyURL)
  // };

  // const axiosProxy = require('axios').create(axiosDefaultConfig);
  try {
    const { data } = await axios.get(url)
    return cheerio.load(data);
  }
  catch (error) {
    console.log('cheerio fetchHTML: ' + error);
  }
}

router.post("/test", async (req, res, next) => {
  const URL = req.body.URL;
  const $ = await fetchHTML(URL);

  res.send ($.html());
});


router.post("/jobs", async (req, res, next) => {
  const URL = req.body.URL;
  const jobKeys = req.body.jobKeys || [];
  const jobsArray = [];
    const $ = await fetchHTML(URL);
    const mosaicData = $("#mosaic-data").html();
    if (mosaicData) {
    const firstTrim = mosaicData.split('window.mosaic.providerData["mosaic-provider-jobcards"]={"metaData":{"mosaicProviderJobCardsModel":')[1];
    const secondTrim = firstTrim.split(',"searchTimestamp"')[0];
    const resultsArrayString = secondTrim.split('"results":')[1];
    const resultsArray = JSON.parse(resultsArrayString);
    
    if (Array.isArray(resultsArray)) {
      resultsArray.map(async (job) => {
        if(!jobKeys.includes(job.jobkey)){
          if(job.loceTagValueList) {
            let address = null;
            let neighborhood = null;
            job.loceTagValueList.map(locString => {
              const locationKey = locString.split('"')[1];
              const locationValue = locString.split('"')[3];
              if (locationKey === 'address') {
                address = `${locationValue}, ${job.formattedLocation}`;
              } else if (locationKey === 'neighborhood') {
                neighborhood = locationValue;
              }
            });
            if (address) {
              jobsArray.push({
                key: job.jobkey,
                jobTitle: job.title,
                company: job.company,
                link: 'https://indeed.com' + job.link,
                urgentlyHiring: job.urgentlyHiring,
                salary: job.salarySnippet.text,
                address: address,
                neighborhood: neighborhood,
                jobTypes: job.jobTypes,
                logo: job.companyBrandingAttributes ? job.companyBrandingAttributes.logoUrl : null,              
                headerImageUrl: job.companyBrandingAttributes ? job.companyBrandingAttributes.headerImageUrl : null,
                formattedRelativeTime: job.formattedRelativeTime,
              });
            }
          }
          jobKeys.push(job.jobkey);
        }
      });
    }

      // add GeoLocation Data
      try {
        const addLocationData = await Promise.all(jobsArray.map(async (job) => {
          const args = {
            params: {
              key: process.env.GOOGLE_MAPS_API_KEY,
              address: job.address,
            }
          };
          const client = new Client();
          const geocode = await client.geocode(args).then(gcResponse => {
            return gcResponse.data.results[0];
          });
          job.location = geocode.geometry.location;
          job.placeId = geocode.place_id;
        }))
      } catch (error){
        console.log("Geocode error: " + error)
      }
      let nextURL = null;
      try {
        if ($('a[aria-label="Next"]')) {
          const href = $('a[aria-label="Next"]').attr('href');
          const pp = $('a[aria-label="Next"]').attr('data-pp');
          if (href && pp) {
            nextURL = 'http://indeed.com' + href + '&pp=' + pp;
          }
        } 
      } catch (e) {
        console.log('next button error: ' + e);
      }
      console.log("Successfully scraped: " + URL);
      res.send({
        jobsArray: jobsArray,
        nextURL: nextURL,
        jobKeys: jobKeys
      });
    } else {
      console.log($.html());
    }
  });



router.get("/test", (req, res, next) => {
  res.send("This is a test!!!!");
});


router.post("/jobdetails", async (req, res, next) => {
  const URL = req.body.URL;
  console.log(URL);
  const $ = await fetchHTML(URL);
  const jobDescription = $("#jobDescriptionText").html();

  res.send({
    jobDescription: jobDescription
  });
});


module.exports = router;
