export const MESSY_TEST_ROWS = [
  {
    OrderID: 'ORD-501',
    OrderDate: '2026-02-01',
    Month: 'February',
    Region: 'West',
    Product: 'Laptop',
    Qty: '5',
    'Unit Price': '$1,200.00',
    Revenue: '$6,000.00'
  },
  {
    OrderID: 'ORD-502',
    OrderDate: '02/05/2026',
    Month: 'Feb',
    Region: 'Wst',
    Product: 'laptop',
    Qty: '2',
    'Unit Price': '1200',
    Revenue: '2400'
  },
  {
    OrderID: 'ORD-503',
    OrderDate: 'Monday, February 9, 2026',
    Month: 'Feb',
    Region: 'West',
    Product: 'Laptop',
    Qty: '-1', // negative quantity (e.g. return)
    'Unit Price': '$1,200',
    Revenue: '-1200'
  },
  {
    OrderID: 'ORD-504',
    OrderDate: '2026-03-01',
    Month: 'Mar.',
    Region: 'East',
    Product: 'Monitor',
    Qty: '10',
    'Unit Price': '$350.00',
    Revenue: '3500'
  },
  {
    OrderID: 'ORD-505',
    OrderDate: '03/15/2026',
    Month: 'Mar',
    Region: 'East',
    Product: 'Monitor',
    Qty: '4',
    'Unit Price': '350',
    Revenue: '1400'
  },
  {
    OrderID: 'ORD-506',
    OrderDate: 'March 20, 2026',
    Month: 'March',
    Region: 'West',
    Product: 'Enterprise Server',
    Qty: '1',
    'Unit Price': '$480,000',
    Revenue: '480000' // high revenue
  },
  {
    OrderID: 'TOTAL',
    OrderDate: '',
    Month: '',
    Region: '',
    Product: 'TOTAL',
    Qty: '21',
    'Unit Price': '',
    Revenue: '$492,100'
  }
];
