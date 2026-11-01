// Small factual reference subset, manually checked against indexed Pakistan Post
// directory entries on 2026-10-30. Not a copy of the nationwide database.
// Source has no per-record update date. No redistribution license is asserted.
export const postalSource = { name:'Pakistan Post — Post Code Directory',url:'https://www.pakpost.gov.pk/postcodes.php',karachiSource:'https://www.pakpost.gov.pk/images/national%20post%20code%20directory.pdf',checkedOn:'2026-10-30',coverage:'10 selected delivery offices in Islamabad, Lahore and Karachi' };
export type PostalRecord={code:string;office:string;accountOffice:string;province:string};
export const pakistanPostalRecords: readonly PostalRecord[] = [
  {code:'44000',office:'ISLAMABAD GPO',accountOffice:'Islamabad GPO',province:'Federal Capital'},
  {code:'44210',office:'ISLAMABAD F-7 MARKAZ',accountOffice:'Islamabad GPO',province:'Federal Capital'},
  {code:'44220',office:'ISLAMABAD F-8 MARKAZ',accountOffice:'Islamabad GPO',province:'Federal Capital'},
  {code:'44100',office:'ISLAMABAD G-10 MARKAZ',accountOffice:'Islamabad GPO',province:'Federal Capital'},
  {code:'54000',office:'LAHORE GPO',accountOffice:'Lahore GPO',province:'Punjab'},
  {code:'54810',office:'LAHORE CANTT. GPO',accountOffice:'Lahore Cantt GPO',province:'Punjab'},
  {code:'54700',office:'LAHORE MODEL TOWN',accountOffice:'Lahore Cantt GPO',province:'Punjab'},
  {code:'74200',office:'KARACHI GPO',accountOffice:'Karachi GPO',province:'Sindh'},
  {code:'75580',office:'KARACHI GOVERNOR HOUSE',accountOffice:'Karachi GPO',province:'Sindh'},
  {code:'75300',office:'KARACHI GULSHAN-E-IQBAL',accountOffice:'New Town GPO',province:'Sindh'},
];
