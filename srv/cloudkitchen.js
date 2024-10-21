
const cds = require('@sap/cds');
const json2xml = require('json2xml');
const { create } = require('xmlbuilder2');
const axios = require('axios');
module.exports = cds.service.impl(async function () {
  const productapi = await cds.connect.to('API_PRODUCT_SRV');
 
    this.on('READ','Products', async req => {
        req.query.SELECT.columns = [{ref:['Product']},{ref:['ProductType']},{ref:['ProductGroup']},{ref:['BaseUnit']},{ref:['to_Description'],expand:['*']}]
        let res = await productapi.run(req.query);  

        res.forEach((element) => {
            element.to_Description.forEach((item) => {
                if (item.Language='EN'){
                    element.ProductDescription=item.ProductDescription; 
                }
            })
    });
    return res;
});
  this.before('READ','ProductLocal',async req=>{
//console.log("working");
//console.log(this.entities);
const {Products,ProductLocal} = this.entities;
console.log("Fired Read");
qry = SELECT.from(Products).columns([{ref:['Product']},{ref:['ProductType']},{ref:['ProductGroup']},{ref:['BaseUnit']},{ref:['to_Description'],expand:['*']}]).limit(1000);
let res=await productapi.run(qry);
res.forEach((element) => {
  //console.log(element.to_Description);
  element.to_Description.forEach((item) => {
      if (item.Language='EN'){
          element.ProductDescription=item.ProductDescription; 
      }
  });
  delete(element.to_Description);
        });
insqry = UPSERT.into(ProductLocal).entries(res);
await cds.run(insqry);     
  })
  this.before('UPDATE','ProductLocal',async req=>{
    const {Products, ProductLocal, ProductDescription}=this.entities;
    console.log(req.data);
    console.log("fired update");
    
        //delete(req.data.ProductDescription);
        console.log(req.data);
        updqry = UPDATE(ProductDescription).data({"ProductDescription":req.data.ProductDescription}).where({Product: req.data.Product, Language: 'EN'})
        await productapi.run(updqry);
    
  });
  
    // INSERT handler
    this.before('CREATE', 'ProductLocal', async req => {
        const { Products, ProductLocal, ProductDescription } = this.entities;
        console.log(req.data);
        console.log("Fired Update");
    
        // Correct the structure of the INSERT query
        const insqry = INSERT.into(Products).entries({
            Product: req.data.Product,
            ProductType: req.data.ProductType,
            BaseUnit: req.data.BaseUnit,
            ProductGroup: req.data.ProductGroup,
            to_Description: [{
                Product: req.data.Product, 
                Language: 'EN',
                ProductDescription: req.data.ProductDescription
            }]
        });
    
        await productapi.run(insqry);
    });
    
    this.on('READ', 'Forms', async (req) => {
      const form = [
        { "FormName": "sonia/Default" },
          { "FormName": "hemanth/Default" },
          { "FormName": "sumanth/Default" },
          { "FormName": "annapurna/Default" },
          { "FormName": "PrePrintedLabel/Default" },
      ];
      form.$count = form.length;
      return form;
  });

    this.on('label','ProductLocal', async (req) => {
      const {ProductLocal}=this.entities
        console.log(req.params);
        console.log(req.data);
        const { Product } = req.params[0];  
        const rowData = await SELECT.one.from(ProductLocal).where({Product: Product});

        if (!rowData) {
            return req.error(404,' No data found for Product: ${Product}');
        }
        rowData.grosswt=req.data.grosswt;
        rowData.netwt=req.data.netwt;
        rowData.totalwt=req.data.totalwt;
        let form = req.data.Forms;
        console.log("Row data:", rowData);
        const xmlfun = (rowData) => {
          const xmlData = json2xml({ Product: rowData }, { header: true });
          return xmlData;
      };
      const callxml = xmlfun(rowData);
      console.log("Generated XML:", callxml);
        const base64EncodedXML = Buffer.from(callxml).toString('base64');

        console.log("Base64 Encoded XML:", base64EncodedXML);
        try {
          const authResponse = await axios.get('https://chembonddev.authentication.us10.hana.ondemand.com/oauth/token', {
              params: {
                  grant_type: 'client_credentials'
              },
              auth: {
                  username: 'sb-ffaa3ab1-4f00-428b-be0a-1ec55011116b!b142994|ads-xsappname!b65488',
                  password: 'e44adb92-4284-4c5f-8d41-66f8c1125bc5$F4bN1ypCgWzc8CsnjwOfT157HCu5WL0JVwHuiuwHcSc='
              }
          });
          const accessToken = authResponse.data.access_token;
          console.log("Access Token:", accessToken);
          const pdfResponse = await axios.post('https://adsrestapi-formsprocessing.cfapps.us10.hana.ondemand.com/v1/adsRender/pdf?templateSource=storageName', {
              xdpTemplate: form,
              xmlData: base64EncodedXML, 
              formType: "print",
              formLocale: "",
              taggedPdf: 1,
              embedFont: 0
          }, {
              headers: {
                  Authorization: `Bearer ${accessToken}`,
                  'Content-Type': 'application/json'
              }
          });
          const fileContent = pdfResponse.data.fileContent;
          console.log("File Content:", fileContent);
          return fileContent;

      } catch (error) {
          console.error("Error occurred:", error);
          return req.error(500, "An error occurred while processing your request.");
      }
        

       
    });
});

/*const cds = require('@sap/cds');
const axios = require('axios');
const qs = require('qs');

module.exports = cds.service.impl(async function () {
    console.log('Entities:', this.entities);

  const { Employees } = this.entities;

  this.on('generatePDF', async (req) => {
    try {
      // Query data from PostgreSQL
      const empData = await SELECT.from(Employees);

      // Process data for the PDF (Example: select the first hospital)
      const pdfData = empData.length ? empData[0] : null;

      if (!pdfData) {
        req.reject(404, 'No data found to generate PDF');
        return; // Ensure we return after rejection
      }

      // Call the PDF generation function
      const pdfBase64 = await generatePDF(pdfData);

      // Return the PDF as binary data
      return Buffer.from(pdfBase64, 'base64'); // Convert back to Buffer for binary response
    } catch (error) {
      req.reject(500, `Error generating PDF: ${error.message}`);
    }
  });
});

// Function to retrieve OAuth2 access token
async function getAccessToken() {
  const tokenUrl = "https://chembonddev.authentication.us10.hana.ondemand.com/oauth/token";
  const data = qs.stringify({
    'grant_type': 'client_credentials',
    'client_id': 'sb-ffaa3ab1-4f00-428b-be0a-1ec55011116b!b142994|ads-xsappname!b65488',
    'client_secret': 'e44adb92-4284-4c5f-8d41-66f8c1125bc5$F4bN1ypCgWzc8CsnjwOfT157HCu5WL0JVwHuiuwHcSc='
  });

  const response = await axios.post(tokenUrl, data, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });

  return response.data.access_token;
}

// Function to generate PDF using Adobe Forms Service
async function generatePDF(data) {
  const accessToken = await getAccessToken();

  const response = await axios({
    method: 'post',
    url: 'https://adsrestapi-formsprocessing.cfapps.us10.hana.ondemand.com/v1/forms/instances',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    data: {
      templateId: 'PrePrintedLabel/Default', // Your template path
      data: data // The data to be filled into the form
    },
    responseType: 'arraybuffer'
  });

  // Return Base64 encoded PDF data
  return Buffer.from(response.data).toString('base64');
}
  */
