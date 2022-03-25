const dotenv = require('dotenv').config();
const router = require("express").Router();
const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const axios = require('axios');

const {Client} = require("@googlemaps/google-maps-services-js");

router.post("/jobs", async (req, res, next) => {
  const URL = req.body.URL;
  const jobKeys = req.body.jobKeys;
  const jobsArray = [];
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(URL);

  const resultsArray = await page.evaluate(() => {
    try {
      return window.mosaic.providerData["mosaic-provider-jobcards"].metaData.mosaicProviderJobCardsModel.results;
    } catch (error) {
      console.log('Puppeteer JobCard Error: ' + error);
    }
  })
  // add data from initial JS object
  if (resultsArray) {
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

  console.log("Successfully scraped: " + URL);

  const nextURL = await page.evaluate(() => {
    try {
      const isNextButton = document.querySelector('a[aria-label="Next"]');
      if(isNextButton) {
        const href = document.querySelector('a[aria-label="Next"]').getAttribute('href');
        const pp = document.querySelector('a[aria-label="Next"]').getAttribute('data-pp');
        return 'http://indeed.com' + href + '&pp=' + pp;
      } else {
        return null;
      }    
    } catch (error) {
      console.log('Puppeteer Next Button Error: ' + error);
    }
    
  });

  res.send({
    jobsArray: jobsArray,
    nextURL: nextURL,
    jobKeys: jobKeys
  });

  await browser.close();
});

async function fetchHTML(url) {
  try {
    const { data } = await axios.get(url);
    return cheerio.load(data);
  }
  catch (error) {
    console.log('cheerio: ' + error);
  }
}

router.post("/jobdetails", async (req, res, next) => {
  const URL = 'https://' + req.body.URL;
  const $ = await fetchHTML(URL);
  const jobDescription = $("#jobDescriptionText").html();
  // const applyLink = $("#applyButtonLinkContainer > a").attribs.href;

  res.send({
    jobDescription: jobDescription
    // applyLink: applyLink
  });
});

module.exports = router;