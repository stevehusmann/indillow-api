const dotenv = require('dotenv').config();
const router = require("express").Router();
const cheerio = require('cheerio');
const res = require('express/lib/response');
const axios = require('axios');
const { get } = require('express/lib/response');

async function fetchHTML(url) {
  try {
    const { data } = await axios.get('http://api.scraperapi.com?api_key='+ process.env.SCRAPER_API_KEY + '&url=' + url);
    return cheerio.load(data);
    }

  catch (error) {
    console.log('cheerio fetchHTML: ' + error);
  }
}

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

          jobsArray.push({
            key: job.jobkey,
            jobTitle: job.title,
            company: job.company,
            formattedLocation: job.formattedLocation,
            link: 'https://indeed.com' + job.link,
            urgentlyHiring: job.urgentlyHiring,
            salary: job.salarySnippet.text,
            jobTypes: job.jobTypes,
            logo: job.companyBrandingAttributes ? job.companyBrandingAttributes.logoUrl : null,              
            headerImageUrl: job.companyBrandingAttributes ? job.companyBrandingAttributes.headerImageUrl : null,
            formattedRelativeTime: job.formattedRelativeTime,
          });
          jobKeys.push(job.jobkey);
        }
      });

    //Fetch and Add Google Place data
      try {
        const addLocationData = await Promise.all(jobsArray.map(async (job) => {
          const query = encodeURIComponent(job.company + ' ' + job.formattedLocation)
          const { data } = await axios.get(`https://maps.googleapis.com/maps/api/place/textsearch/json?query=${query}&key=${process.env.GOOGLE_MAPS_API_KEY}`);
          job.placeId = data.results[0].place_id;
          job.address = data.results[0].formatted_address;
          job.location = data.results[0].geometry.location;
        }))
      } catch (error){
        console.log("Places API error: " + error)
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