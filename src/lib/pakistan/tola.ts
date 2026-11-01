import type { ConverterDefinition } from '../converters/definitions';
export const GRAMS_PER_TOLA = 11.6638038;
export const tolaDefinition: ConverterDefinition = {
  id:'tola-to-gram-converter',kind:'linear',baseSymbol:'g',defaultFrom:'tola',defaultTo:'g',
  units:[{id:'tola',name:'Tola (South Asian standard)',symbol:'tola',factor:GRAMS_PER_TOLA},{id:'g',name:'Gram',symbol:'g',factor:1},{id:'kg',name:'Kilogram',symbol:'kg',factor:1000}],
};
