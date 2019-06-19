const Util = require('./Util');
const websiteTable = Util.getTableName('website');
const userTable = Util.getTableName('user');
const pageTable = Util.getTableName('page');
const componentsTable = Util.getTableName('components');
const uuidv4 = require('uuid/v4');

module.exports = {
    async login(event) {
        const paramsUserId = event.queryStringParameters.userId;

        const authenticatedUser = await getUserByUsername(paramsUserId);
        if (!authenticatedUser || authenticatedUser.Count === 0) {
            return Util.envelop({ message : 'We can\'t find you.'}, 422);
        }
        const userWebsites = await getUserWebsite(authenticatedUser.Items[0].id)
        if (userWebsites.Count === 0) {
            return Util.envelop({ message : 'You don\'t have any websites'}, 422);
        }
        if (userWebsites.Count > 1) {
            return Util.envelop({
                user: authenticatedUser,
                dashboard: 'www.sembler.io/dashboard'
            });
        }

        console.log('userWebsites', userWebsites.Items[0].init_pageId.id)
        const intialPage = await getPageById(userWebsites.Items[0].init_pageId.id);
        console.log('intialPage', intialPage.Item)
        // const components = getComponentsByPageId(intialPage.id);

        return Util.envelop({
            user: authenticatedUser.Items[0],
            website: userWebsites.Items[0],
            page: intialPage.Item,
            // components: components.Items[0]
        });
    }
};
function getUserByUsername(aUsername) {
    return Util.DocumentClient.query({
        TableName: userTable,
        IndexName: 'usernameIndex',
        KeyConditionExpression: 'username = :username',
        ExpressionAttributeValues: {
            ':username': aUsername,
        },
        Select: 'ALL_ATTRIBUTES',
    }).promise();
}
function getUserWebsite(aUserId) {
    return Util.DocumentClient.query({
        TableName: websiteTable,
        IndexName: 'userIdIndex',
        KeyConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: {
            ':userId': aUserId,
        },
        Select: 'ALL_ATTRIBUTES',
    }).promise();
}
function getPageById(aPageId) {
    return Util.DocumentClient.get(
        {
            TableName: pageTable,
            Key: {
                id: aPageId,
            },
        }
    ).promise();
}
function getPageByWebsiteId(aWebsiteId) {
    return Util.DocumentClient.query({
        TableName: pageTable,
        IndexName: 'websiteIndex',
        KeyConditionExpression: 'websiteId = :websiteId',
        ExpressionAttributeValues: {
            ':websiteId': aWebsiteId,
        },
        Select: 'ALL_ATTRIBUTES',
    }).promise();
}
function getComponentsByPageId(aPageId) {
    return Util.DocumentClient.query({
        TableName: componentsTable,
        IndexName: 'pageIdIndex',
        KeyConditionExpression: 'pageId = :pageId',
        ExpressionAttributeValues: {
            ':pageId': aPageId,
        },
        Select: 'ALL_ATTRIBUTES',
    }).promise();
}
