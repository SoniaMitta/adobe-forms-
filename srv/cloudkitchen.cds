

using {com.satinfotech.cloudapps as ClKitchen} from '../db/schema';
using {API_PRODUCT_SRV as productapi} from './external/API_PRODUCT_SRV';
service CloudKitchen  @(requires: 'authenticated-user') {
    entity Kitchen  @(restrict: [ 
    { grant: ['READ'], to: 'CloudKitchenRead' },
    { grant: ['WRITE'], to: 'CloudKitchenWrite'},
    { grant: ['DELETE'], to: 'CloudKitchenDelete'},
  ]) as projection on ClKitchen.Kitchen
  entity Products as projection on productapi.A_Product{
    Product,
    ProductType,
    BaseUnit,
    ProductGroup,
    to_Description,
    
  }
 
  entity ProductDescription as projection on productapi.A_ProductDescription{
    Product,
    Language,
    ProductDescription
  };
  entity Forms {
        key ID: UUID;
        FormName: String(80);
    }
    
  entity ProductLocal as projection on ClKitchen.ProductLocal actions{
    

      action label(
            grosswt: String(80) @Common.Label: 'Gross Weight',
            netwt: String(80) @Common.Label: 'Net Weight',
            totalwt: String(80) @Common.Label: 'Total Weight',
            Forms: String(80) @Common.Label: 'Forms' @Common.ValueList: {
              CollectionPath: 'Forms', 
              Label: 'Label',
              Parameters: [
                {
                  $Type: 'Common.ValueListParameterInOut',
                  LocalDataProperty: 'Forms',  
                  ValueListProperty: 'FormName'    
                }
              ]
            }) returns String;
  
  };
}

annotate CloudKitchen.Kitchen with @odata.draft.enabled;
annotate CloudKitchen.ProductLocal with @odata.draft.enabled;
annotate CloudKitchen.Forms with @(UI.LineItem: [
    {
        $Type: 'UI.DataField',
        Value: 'ID'
    },
    {
        $Type: 'UI.DataField',
        Value: 'FormName'
    }
]);