const constantModel = require('../constants/model.js');

const categories = [
  "Wheel",
  "Truck",
  "Deck",
  "All Grip",
  // Other parts of Complete Sets
  // that are always included e.g. screw kits, shock pads, & bearings
  "Auxiliary",
  "Shipping", // Boxes, truck inserts, Learn brochures
  "Accessory", // Optional parts of CS (Edge guards, etc)
  "Apparel", // Shirts, Bags, etc
  "Other", // Stickers, etc
];
module.exports.categories = categories;

const colors = [ // Order from custom tool
  "Black",
  "White",
  "Cyan",
  "Pink",
  "Red",
  "Yellow",
  "Orange",
  "Lavender",
  "Green",
  "ForestGreen",
  "Marine",
  "Violet",
  "Mint",
  "Chrome",
  "Silver",
  "Gold",
  "Sakura",
  "Brown",
];
module.exports.colors = colors;

module.exports.inventories = ["JMKRIDE-USA-BackOffice"]
module.exports.defaultDefaultInventory = "JMKRIDE-USA-BackOffice";
module.exports.getDefaultDefaultInventoryId = () => constantModel.getByName(
  module.exports.defaultDefaultInventory
).then(doc => doc.id)

module.exports.categorySets = ["Default Category Set"]
module.exports.defaultDefaultCategorySet = "Default Category Set";
module.exports.getDefaultDefaultCategorySetId = () => constantModel.getByName(
  module.exports.defaultDefaultCategorySet
).then(doc => doc.id)

module.exports.CSSets = ["Default CS Set"]
module.exports.defaultDefaultCSSet = "Default CS Set";
module.exports.getDefaultDefaultCSSetId = () => constantModel.getByName(
  module.exports.defaultDefaultCSSet
).then(doc => doc.id)

const genAllParts = () => {
  const partTypeToPartColors = {
    "Wheel": colors.filter(
      color => !(["Brown", "Chrome", "Silver", "Sakura", "Gold", "ForestGreen"].includes(color))
    ),
    "Truck": colors.filter(
      color => !(["Brown", "ForestGreen"].includes(color))
    ),
    "Deck": colors.filter(
      color => !(["Brown", "ForestGreen"].includes(color))
    ),
  }


  // Standard Color Parts for complete sets
  let standardParts = [];
  Object.keys(partTypeToPartColors).map(partType =>
    standardParts = standardParts.concat(
      partTypeToPartColors[partType].map(partColor => ({
        name: partColor + " " + partType,
        color: partColor,
        categoryName: partType, // will be persisted as category in postprocessing
        quantityMap: {},
      }))
    )
  );

  const createPartsWithType = (type, parts) =>
    parts.map(part => ({
      name: part[0],
      color: part[1],
      categoryName: type,
      quantityMap: {},
    }));

  let gripParts = createPartsWithType("All Grip", [
    ["Cyan/Black SL Grip", "Cyan"],
    ["Black/Red SL Grip", "Black"],
    ["Black/Green SL Grip", "Black"],
    ["Black/White SL Grip", "Black"],
    ["Marine/Black SL Grip", "Marine"],
    ["Mint/White SL Grip", "Mint"],
    ["Yellow/Black SL Grip", "Yellow"],
    ["Violet/Black SL Grip", "Violet"],
    ["Black/Orange SL Grip", "Black"],
    ["Cyan-Yellow-Cyan Spectrum Grip", "Cyan"],
    ["Marine-Violet-Green/White Spectrum Grip", "Marine"],
    ["Marine-Violet-Green/Black Spectrum Grip", "Marine"],
    ["Pink-Cyan-Violet Spectrum Grip", "Pink"],
    ["Isamu Orange Grip", "Orange"],
    ["Isamu Wall Art Grip", "Violet"],
    ["Isamu Skull Grip", "Marine"],
    ["RWU Rasta Grip", "Red"],
    ["RWU Lavender Pink White Grip", "Lavender"],
    ["RWU Violet Marine Mint Grip", "Marine"],
    ["Mattie Grip", "Marine"],
    ["Kyoki Grip", "Marine"],
    ["Jon Grip", "Brown"],
    ["Green Retro Grip", "Green"],
    ["Violet Retro Grip", "Violet"],
    ["Red Retro Grip", "Red"],
    ["Cyan Retro Grip", "Cyan"],
    ["White Retro Grip", "White"],
    ["Green Snow Grip", "Green"],
    ["Violet Snow Grip", "Violet"],
    ["Cyan Snow Grip", "Cyan"],
    ["Pink Snow Grip", "Pink"],
    ["Red Snow Grip", "Red"],
    ["Black Snow Grip", "Black"],
    ["Orange Snow Grip", "Orange"],
    ["Marine Snow Grip", "Marine"],
    ["Black/Violet Snow Grip", "Black"],
    ["Black/Marine Snow Grip", "Black"],
    ["Orange/White Grip", "Orange"],
    ["Green/Violet Grip", "Green"],
    ["Violet/Black Grip", "Violet"],
    ["Yellow/Black Grip", "Yellow"],
    ["Cyan/Black Grip", "Cyan"],
    ["Marine/Black Grip", "Marine"],
    ["Red/White Grip", "Red"],
    ["Black/Cyan Grip", "Black"],
    ["Black/Marine Grip", "Black"],
    ["Black/Red Grip", "Black"],
    ["Black/Violet Grip", "Black"],
    ["Black/Yellow Grip", "Black"],
    ["Black/Orange Grip", "Black"],
    ["Lavender/Yellow Grip", "Lavender"],
    ["Green/White Grip", "Green"],
    ["Pink/White Grip", "Pink"],
    ["White/Pink Grip", "White"],
    ["Cyan/Yellow Grip", "Cyan"],
    ["Red/Black Grip", "Red"],
    ["Yellow/Green Grip", "Yellow"],
    ["Lavender/White Grip", "Lavender"],
    ["Mint/White Grip", "Mint"],
    ["White/Black Grip", "White"],
    ["Black/White Grip", "Black"],
  ]);

  let auxiliaryParts = createPartsWithType("Auxiliary", [
    ["Screw Kit", "Silver"],
    ["Shock Pad", "White"],
    ["Bearing", "Black"],
  ]);

  let shippingParts = createPartsWithType("Shipping", [
    ["CS Box", "Cyan"],
    ["8x8x4 Standard Box", "Brown"],
    ["Truck Insert", "Cyan"],
  ]);

  let accessoryParts = createPartsWithType("Accessory", [
    ["Red Classic Edgeguard", "Red"],
    ["Black Classic Edgeguard", "Black"],
    ["Orange Classic Edgeguard", "Orange"],
    ["Green Classic Edgeguard", "Green"],
    ["White Classic Edgeguard", "White"],
    ["Transparent Classic Edgeguard", "Chrome"],
    ["Yellow Premium Edgeguard", "Yellow"],
    ["Green Premium Edgeguard", "Green"],
    ["Black Premium Edgeguard", "Black"],
    ["Mint Premium Edgeguard", "Mint"],
    ["Orange Premium Edgeguard", "Orange"],
    ["Cyan Premium Edgeguard", "Cyan"],
    ["Pink Premium Edgeguard", "Pink"],
    ["Violet Premium Edgeguard", "Violet"],
    ["Cyan Shoulder Bag", "Cyan"],
    ["Green Shoulder Bag", "Green"],
    ["Pink Shoulder Bag", "Pink"],
  ]);
  let apparelParts = createPartsWithType("Apparel", [
    ["Jeff Shirt XL", "Cyan"],
    ["Jeff Shirt L", "Cyan"],
    ["Jeff Shirt M", "Cyan"],
    ["Jeff Shirt S", "Cyan"],
    ["Hoodie XL", "Black"],
    ["Hoodie L", "Black"],
    ["Hoodie M", "Black"],
    ["Hoodie S", "Black"],
    ["Zip Hoodie XL", "Silver"],
    ["Zip Hoodie L", "Silver"],
    ["Zip Hoodie M", "Silver"],
    ["Zip Hoodie S", "Silver"],
    ["Side Logo Shirt XL", "Black"],
    ["Side Logo Shirt L", "Black"],
    ["Side Logo Shirt M", "Black"],
    ["Side Logo Shirt S", "Black"],
    ["Mattie Shirt XL", "Cyan"],
    ["Mattie Shirt L", "Cyan"],
    ["Mattie Shirt M", "Cyan"],
    ["Mattie Shirt S", "Cyan"],
    ["Hat Grey", "Black"],
    ["Hat Tan", "Yellow"],
    ["Hat Cyan", "Cyan"],
    ["Hat Green", "Green"],
    ["Rasta Shirt XL", "Red"],
    ["Rasta Shirt L", "Red"],
    ["Rasta Shirt M", "Red"],
    ["Rasta Shirt S", "Red"],
    ["White Logo Shirt XL", "White"],
    ["White Logo Shirt L", "White"],
    ["White Logo Shirt M", "White"],
    ["White Logo Shirt S", "White"],
    ["Purple Kyoki Shirt XL", "Violet"],
    ["Purple Kyoki Shirt L", "Violet"],
    ["Purple Kyoki Shirt M", "Violet"],
    ["Purple Kyoki Shirt S", "Violet"],
    ["Green Logo Shirt XL", "Green"],
    ["Green Logo Shirt L", "Green"],
    ["Green Logo Shirt M", "Green"],
    ["Green Logo Shirt S", "Green"],
    ["Cyan Logo Shirt XL", "Cyan"],
    ["Cyan Logo Shirt L", "Cyan"],
    ["Cyan Logo Shirt M", "Cyan"],
    ["Cyan Logo Shirt S", "Cyan"],
  ]);

  let otherParts = createPartsWithType("Other", [
    ["Sticker Sheet", "White"],
  ]);

  return standardParts
    .concat(gripParts)
    .concat(auxiliaryParts)
    .concat(shippingParts)
    .concat(accessoryParts)
    .concat(apparelParts)
    .concat(otherParts);
};

module.exports.allParts = genAllParts();

module.exports.actions = {
  CREATE: "CREATE",                       // create part/complete set
  MODIFY: "MODIFY",                       // edit data of a part/complete set
  DELETE: "DELETE",                       // delete part/complete set
  UPDATE_QUANTITY: "UPDATE_QUANTITY",     // add/subtract from an inventory
  TRANSFER_QUANTITY: "TRANSFER_QUANTITY", // transfer to/from inventories
};

module.exports.CSPropertyList = [
  'lwheel1', 'lwheel2',
  'ltruck', 'ldeck', 'lgrip',
  'rwheel1', 'rwheel2',
  'rtruck', 'rdeck', 'rgrip',
]
