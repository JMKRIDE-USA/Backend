const inventoryModel = require('./model.js');
const inventoryConstants = require('./constants.js');
const userModel = require('../users/model.js');
const { actions } = require('./constants.js');
const { operationMode } = require('../environment.js');

/* -------------------------- Logging -------------------------------- */

const executeThenLog = (fn, { action, actor, payload, quantity, inventory, displayLogId}) =>
  fn().then(async doc => {
    let displayLog = displayLogId ? displayLogId : inventoryModel.getId();
    if(!displayLogId) {
      await inventoryModel.createDisplayLog({raw: true, _id: displayLog})
    }
    await inventoryModel.createLog({
      actor, action,
      subjectType: doc.constructor.modelName,
      subject: doc._id,
      quantity, payload, inventory,
      displayLog: displayLog,
    });
    return doc;
  });

const logThenExecuteDeletion = (fn, { subject, action, actor}) => {
  let displayLogId = inventoryModel.getId();
  inventoryModel.createDisplayLog({raw: true, _id: displayLogId})
  inventoryModel.createLog({
    actor, action,
    subjectType: subject.constructor.modelName,
    subject: subject._id,
    payload: subject,
    displayLog: displayLogId,
  }).then(fn);
}


/* -------------------------- Parts ----------------------------------- */

exports.createPart = ({actor, ...partData}) => executeThenLog(
    () => inventoryModel.createPart(partData),
    {
      action: actions.CREATE,
      actor: actor,
      payload: partData,
    }
  );

const getCategories = async ({categoryIds}) => {
  const categories = [];
  await Promise.all(categoryIds.map(categoryId =>
    inventoryModel.getCategoryById(categoryId).then(category => {
      categories.push({sortIndex: category.length, category: category.id})
    })
  ))
  return categories
}

/* createPartWithCategories
 *  categoryIds - [categoryIds]
 */
exports.createPartWithCategories = async ({actor, categoryIds, inventoryId, quantity, ...partData}) => {
  partData = {
    ...partData,
    creator: actor,
    categories: [],
    quantityMap: (inventoryId && quantity) ?  {[inventoryId]: quantity} : {},
  }
  await Promise.all(categoryIds.map(categoryId =>
    inventoryModel.getCategoryById(categoryId).then(category => {
      partData.categories.push({sortIndex: category.length, category: category.id})
    })
  ))
  return await exports.createPart({actor, ...partData})
}

exports.patchPart = ({actor, partId, categoryIds, ...partData}) =>
  executeThenLog(
    () => getCategories({categoryIds})
      .then(categories => inventoryModel.patchPart(partId, {...partData, categories})),
    {
      action: actions.MODIFY,
      actor: actor,
      payload: partData,
    }
  );

exports.updatePartQuantity = ({partId, inventoryId, quantity, actor, displayLogId}) =>
  executeThenLog(
    () => inventoryModel.updatePartQuantity({partId, inventoryId, quantity}),
    {
      action: actions.UPDATE_QUANTITY,
      actor, quantity, inventory: inventoryId,
      displayLogId,
    },
  );

exports.transferPartQuantity = ({partId, fromInventoryId, toInventoryId, quantity, actor}) =>
  inventoryModel.createDisplayLog({
    actor, quantity, subjectType: 'part', subject: partId,
    action: actions.TRANSFER_QUANTITY,
  }).then(result => 
    Promise.all([
      exports.updatePartQuantity({
        partId, inventoryId: fromInventoryId, quantity: -quantity, displayLogId: result._id, actor,
      }),
      exports.updatePartQuantity({
        partId, inventoryId: toInventoryId, quantity, displayLogId: result._id, actor,
      }),
    ])
  );

/* -------------------------- Categories ----------------------------------- */

const fixCategoryData = async ({actor, categorySetIds, ...categoryData}) => {
  let fixedCategoryData = {
    ...categoryData,
    creator: actor,
    categorySets: [],
  }
  await Promise.all(categorySetIds.map(categorySetId =>
    inventoryModel.getCategorySetById(categorySetId).then(categorySet => {
      fixedCategoryData.categorySets.push(
        {sortIndex: categorySet.length, categorySet: categorySet.id}
      )
    })
  ))
  return fixedCategoryData;
};

exports.createCategory = async ({actor, partIds, ...categoryData}) => {
  let fixedData = await fixCategoryData({actor, ...categoryData});
  return executeThenLog(
    () => inventoryModel.createCategory(fixedData).then(async doc => {
      await syncPartIdsWithCategory({categoryId: doc._id, partIds})
      return doc;
    }),
    {
      action: actions.CREATE,
      actor, payload: {partIds, ...categoryData},
    },
  );
}

exports.setCategoryPartOrder = ({categoryId, itemOrder}) =>
  Promise.all(
    itemOrder.map(({id, index}) =>
      inventoryModel.setPartCategoryOrder({
        partId: id, categoryId: categoryId, sortIndex: index
      })
    )
  );

exports.sortCategory = async ({categoryId}) => {
  const itemOrder = (
    await inventoryModel.getPartsByCategory({categoryId})
  ).map((doc, index) => ({id: doc._id, index}));
  return await exports.setCategoryPartOrder({categoryId, itemOrder});
}

/* -------------------------- CategorySets ----------------------------------- */

exports.setCategorySetCategoryOrder = async ({categorySetId, itemOrder}) => {
  return await Promise.all(
    itemOrder.map(({id, index}) =>
      inventoryModel.setCategoryCategorySetOrder({
        categoryId: id, categorySetId: categorySetId, sortIndex: index,
      })
    )
  );
}

exports.sortCategorySet = async ({categorySetId}) => {
  const allCategoryIds = (
    await inventoryModel.getCategoriesByCategorySet({categorySetId})
  ).map((doc, index) => ({id: doc._id, index}));
  return exports.setCategorySetCategoryOrder({categorySetId, itemOrder: allCategoryIds});
}

exports.setCategoryPartOrder = async ({categoryId, itemOrder}) => 
  await Promise.all(
    itemOrder.map(({id, index}) => inventoryModel.setPartCategoryOrder({
      partId: id, categoryId, sortIndex: index,
    }))
  );

exports.setCSSetCSOrder = async ({CSSetId, itemOrder}) =>
  await Promise.all(
    itemOrder.map(({id, index}) => inventoryModel.setCSCSSetOrder({
      CSId: id, CSSetId: CSSetId, sortIndex: index,
    }))
  );

exports.postSetup = async () => {
  /* sort all categories */
  await inventoryModel.getAllCategories().then(categories => Promise.all(
    categories.map(category =>
      exports.sortCategory({categoryId: category._id})
    )
  ));
  /* sort all categorysets */
  await inventoryModel.getAllCategorySets().then(categorySets => Promise.all(
    categorySets.map(categorySet =>
      exports.sortCategorySet({categorySetId: categorySet._id})
    )
  ));

  if(["development", "unittest"].includes(operationMode)) {
    /* initialize all uninitialized inventories */
    /* if in development mode, set random inventory amounts */
    await inventoryModel.getAllInventories().then(inventories =>
      Promise.all(inventories.map((inventory) => {
        if(!inventory.initialized) {
          inventoryModel.getAllParts().then(parts => Promise.all(
            parts.map(part => inventoryModel.updatePartQuantity(
              {
                partId: part._id,
                inventoryId: inventory._id,
                quantity: Math.floor(Math.random() * 1000),
              },
            ))
          )).then(() => inventoryModel.patchInventory(inventory._id, {initialized: true}))
        }
      }))
    )
  }
}

/* -------------------------- Complete Sets ----------------------------------- */

exports.createCompleteSet = ({actor, ...CSData}) => {
  return executeThenLog(
    () => inventoryModel.createCompleteSet(CSData),
    {
      action: actions.CREATE,
      actor, payload: CSData,
    }
  );
}
exports.patchCompleteSet = ({completeSetId, actor, ...CSData}) => {
  return executeThenLog(
    () => inventoryModel.patchCompleteSet(completeSetId, CSData),
    {
      action: actions.MODIFY,
      actor, payload: CSData,
    }
  );
}

const fixCSData = async ({actor, CSSetIds, ...CSData}) => {
  CSData = {
    ...CSData,
    actor, creator: actor,
    CSSets: [],
  }
  await Promise.all(CSSetIds.map(CSSetId =>
    inventoryModel.getCSSetById(CSSetId).then(CSSet => {
      CSData.CSSets.push({sortIndex: CSSet.length, CSSet: CSSet.id})
    })
  ))
  return CSData;
};

exports.patchCompleteSetWithCSSets = async (CSData) => {
  return await exports.patchCompleteSet(await fixCSData(CSData));
}

exports.createCompleteSetWithCSSets = async (CSData) => {
  return await exports.createCompleteSet(await fixCSData(CSData));
}



/*
 * adds "quantity" property to results for ease of use from client
 *  - parts must be an array of JS objects (mongoose docs must be lean()ed)
 */
exports.setPartResultsQuantity = (inventoryId) => (parts) => 
  parts.map(part => {
    if(!part) return;
    if(Object.hasOwnProperty.call(part.quantityMap, inventoryId)) {
      part.quantity = part.quantityMap[inventoryId];
    } else {
      part.quantity = 0;
    }
    delete part.quantityMap;
    return part;
  });

exports.handleDeletedCSSet = (CSSetId) =>
  inventoryModel.getCompleteSets({CSSetId}).then(results => Promise.all(
    results.map(completeSet => inventoryModel.removeCompleteSetFromCSSetId(
      {completeSetId: completeSet._id, CSSetId}
    ))
  ));

exports.handleDeletedCategory = (categoryId) =>
  inventoryModel.getPartsByCategory({categoryId}).then(results => Promise.all(
    results.map(part => inventoryModel.removePartFromCategory(
      {partId: part._id, categoryId}
    ))
  ));

exports.handleDeletedCategorySet = (categorySetId) =>
  inventoryModel.getCategoriesByCategorySet({categorySetId}).then(results => Promise.all(
    results.map(category => inventoryModel.removeCategoryFromCategorySet(
      {categoryId: category._id, categorySetId}
    ))
  ));

exports.addCompleteSetHelperInfo = (inventoryId) => (completeSet) => {
  /* <id>: <num appearances> */
  let idOccurances = {}
  let uniqueParts = []
  inventoryConstants.CSPropertyList.forEach(prop => {
    let part = completeSet[prop];
    let id = part._id.toString()
    // increment part count
    if(!Object.hasOwnProperty.call(idOccurances, id)) {
      idOccurances[id] = 0;
      uniqueParts.push(part);
    }
    idOccurances[id] += 1;
  });
  completeSet.idOccurances = idOccurances;
  completeSet.allParts = uniqueParts.map(part => {
    let opart = JSON.parse(JSON.stringify(part));
    if(part.quantityMap.has(inventoryId)) {
      opart.quantity = part.quantityMap.get(inventoryId);
    } else {
      opart.quantity = 0;
    }
    return opart;
  });
  return completeSet;
}
exports.createCSSetWithCSIds = ({actor, CSIds, ...CSSetData}) =>
  executeThenLog(
    () => inventoryModel.createCSSet(CSSetData).then(
      async (doc) => {
        await syncCSIdsWithCSSet({CSSetId: doc._id, CSIds: CSIds});
        return doc;
      }
    ),
    {
      action: actions.CREATE,
      actor, payload: {...CSSetData, CSIds}
    }
  );
exports.patchCSSetWithCSIds = ({actor, CSSetId, CSIds, ...CSSetData}) =>
  executeThenLog(
    () => inventoryModel.patchCSSet(CSSetId, CSSetData).then(
      async (doc) => {
        await syncCSIdsWithCSSet({CSSetId: doc._id, CSIds: CSIds});
        return doc;
      }
    ),
    {
      action: actions.MODIFY,
      actor, payload: {...CSSetData, CSIds}
    }
  );

const syncSingleWithMany = async (
  {singleId, manyIds, singleKey, manyKey, getMany, addManyToSingle, removeManyFromSingle}
) => {
  const idsInSingle = (await getMany({[singleKey]: singleId})).map(doc => doc._id.toString());
  const idsToRemove = idsInSingle.filter(id => !manyIds.includes(id));
  const idsToAdd = manyIds.filter(id => !idsInSingle.includes(id));
  return await Promise.all(
    idsToAdd.map(id => 
      addManyToSingle({[singleKey]: singleId, [manyKey]: id})
    ).concat(idsToRemove.map(id => removeManyFromSingle(
      {[singleKey]: singleId, [manyKey]: id}
    )))
  );
}

const syncPartIdsWithCategory = ({categoryId, partIds}) => syncSingleWithMany({
  singleId: categoryId, singleKey: "categoryId", manyIds: partIds, manyKey: "partId",
  getMany: inventoryModel.getPartsByCategory,
  addManyToSingle: inventoryModel.addPartToCategory,
  removeManyFromSingle: inventoryModel.removePartFromCategory
});
const syncCategorySetIdsWithCategory = ({categoryId, categorySetIds}) => syncSingleWithMany({
  singleId: categoryId, singleKey: "categoryId", manyIds: categorySetIds, manyKey: "categorySetId",
  getMany: (({categoryId}) => 
    inventoryModel.getCategoryById(categoryId)
      .then(c => c.categorySets.map(cset => cset.categorySet))
  ),
  addManyToSingle: inventoryModel.addCategoryToCategorySet,
  removeManyFromSingle: inventoryModel.removeCategoryFromCategorySet,
});
const syncCSIdsWithCSSet = ({CSSetId, CSIds}) => syncSingleWithMany({
  singleId: CSSetId, singleKey: "CSSetId", manyIds: CSIds, manyKey: "completeSetId",
  getMany: inventoryModel.getCompleteSets,
  addManyToSingle: inventoryModel.addCompleteSetToCSSetId,
  removeManyFromSingle: inventoryModel.removeCompleteSetFromCSSetId,
});
const syncCategoryIdsWithCategorySet = ({categorySetId, categoryIds}) => syncSingleWithMany({
  singleId: categorySetId, singleKey: "categorySetId", manyIds: categoryIds, manyKey: "categoryId",
  getMany: inventoryModel.getCategoriesByCategorySet,
  addManyToSingle: inventoryModel.addCategoryToCategorySet,
  removeManyFromSingle: inventoryModel.removeCategoryFromCategorySet,
});


exports.patchCategory = (categoryId, {actor, partIds, categorySetIds, ...categoryData}) =>
  executeThenLog(
    () => inventoryModel.patchCategory(categoryId, categoryData).then(
      async doc => {
        await syncPartIdsWithCategory({categoryId, partIds});
        await syncCategorySetIdsWithCategory({categoryId, categorySetIds});
        return doc;
      }
    ),
    {
      action: actions.MODIFY,
      actor, payload: {...categoryData, partIds},
    },
  );

exports.patchCategorySetWithCategoryIds = (
  categorySetId, {actor, categoryIds, ...categorySetData}
) => executeThenLog(
    () => inventoryModel.patchCategorySet(categorySetId, categorySetData).then(
      async doc => {
        await syncCategoryIdsWithCategorySet({categorySetId, categoryIds})
        return doc;
      }
    ),
    {
      action: actions.MODIFY,
      actor, payload: {...categorySetData, categoryIds},
    },
  );
exports.createCategorySetWithCategoryIds = ({actor, categoryIds, ...categorySetData}) =>
  executeThenLog(
    () => inventoryModel.createCategorySet(categorySetData).then(
      async doc => {
        await syncCategoryIdsWithCategorySet({categorySetId: doc._id, categoryIds})
        return doc;
      }
    ),
    {
      action: actions.CREATE,
      actor, payload: {...categorySetData, categoryIds},
    },
  );

exports.updateCompleteSetQuantity = async ({ completeSetId, inventoryId, quantity, actor }) => {
  const completeSet = await inventoryModel.getCompleteSetById(completeSetId)
    .then(exports.addCompleteSetHelperInfo(inventoryId))
  return inventoryModel.createDisplayLog({
    actor, quantity, subjectType: 'completeset', subject: completeSet,
    action: actions.UPDATE_QUANTITY, inventory: inventoryId,
  }).then(result =>
    Promise.all(Object.keys(completeSet.idOccurances).map(
      async partId => await exports.updatePartQuantity({
        partId, inventoryId, quantity: completeSet.idOccurances[partId] * quantity, actor,
        displayLogId: result._id,
      })
    ))
    .then(() => exports.withdrawAuxiliaryParts({
      userId: actor, inventoryId, quantity, displayLogId: result._id,
    }))
  )
}

exports.redactCreatorInfo = (doc) => {
  if (doc && doc.creator) {
    let object = {
      firstName: doc.creator.firstName,
      lastName: doc.creator.lastName,
      fullName: doc.creator.fullName,
    }
    doc.creator = object;
  }
  return doc;
}

exports.withdrawAuxiliaryParts = async ({userId, inventoryId, quantity, displayLogId}) => {
  const user = await userModel.findById(userId);
  if(user.settings.withdrawAuxiliaryParts) {
    return Promise.all(
      user.settings.auxiliaryParts.map(([perSet, partId]) => 
        exports.updatePartQuantity(
          {partId, inventoryId, quantity: quantity * perSet, actor: userId, displayLogId}
        )
      )
    )
  }
}

exports.deletePart = ({actor, partId}) => 
  inventoryModel.getPartById(partId).then(part =>
    logThenExecuteDeletion(
      () => inventoryModel.deletePartById(partId),
      {
        action: actions.DELETE,
        actor, subject: part,
      },
    )
  )

exports.deleteCSSet = ({actor, CSSetId}) => 
  inventoryModel.getCSSetById(CSSetId).then(
    CSSet => logThenExecuteDeletion(
      () => inventoryModel.deleteCSSet(CSSetId),
      {
        action: actions.DELETE,
        actor, subject: CSSet,
      },
    )
  )

exports.deleteCS = ({actor, completeSetId}) =>
  inventoryModel.getCompleteSetById(completeSetId).then(
    completeSet => logThenExecuteDeletion(
      () => inventoryModel.deleteCS(completeSetId),
      {
        action: actions.DELETE,
        actor, subject: completeSet,
      },
    )
  )

exports.deleteCategorySet = ({actor, categorySetId}) =>
  inventoryModel.getCategorySetById(categorySetId).then(
    categorySet => logThenExecuteDeletion(
      () => inventoryModel.deleteCategorySet(categorySetId),
      {
        action: actions.DELETE,
        actor, subject: categorySet,
      },
    )
  )

exports.deleteCategory = ({actor, categoryId}) => 
  inventoryModel.getCategoryById(categoryId).then(
    category => logThenExecuteDeletion(
      () => inventoryModel.deleteCategory(categoryId),
      {
        action: actions.DELETE,
        actor, subject: category,
      },
    )
  )

exports.createInventory = ({actor, inventoryData}) =>
  executeThenLog(
    () => inventoryModel.createInventory({...inventoryData, creator: actor}),
    { action: actions.CREATE, actor, payload: inventoryData }
  );

exports.patchInventory = ({actor, inventoryId, patchData}) =>
  executeThenLog(
    () => inventoryModel.patchInventory(inventoryId, patchData),
    { action: actions.MODIFY, actor, payload: patchData }
  );

exports.deleteInventory = ({actor, inventoryId}) =>
  inventoryModel.getInventoryById(inventoryId).then(
    inventory => logThenExecuteDeletion(
      () => inventoryModel.deleteInventory(inventoryId),
      {
        actions: actions.DELETE,
        actor, subject: inventory,
      },
    )
  );
