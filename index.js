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
    },
    async create(event) {

        const userData = JSON.parse(event.body);
        const user = {
            id: uuidv4(),
            username: userData.username,
        };
        console.log(event.body);
        console.log(user);
        await Util.DocumentClient.put({
            TableName: userTable,
            Item: user,
        }).promise();

        const pageId = uuidv4();
        const website = {
            id: uuidv4(),
            name: `Site`,
            subDomain: `${user.id}.sembler.io`,
            enable_domain: false,
            status: 'unpublished',
            init_pageId: {
                id: pageId,
                name: 'Home',
                path: '/home',
            },
            userId: user.id,
            protocol_https: false,
            order: 1
        };

        await Util.DocumentClient.put({
            TableName: websiteTable,
            Item: website,
        }).promise();

        const page = {
            id: pageId,
            name: 'Home',
            path: '/home',
            websiteId: `${website.id}`,
            order: 1,
            userId: `${user.id}`
        };
        await Util.DocumentClient.put({
            TableName: pageTable,
            Item: page,
        }).promise();
        return Util.envelop({
            user: user,
            website:website,
            page:page
        });
    },
    async get(event) {
        const authenticatedUser = await authenticateAndGetUser(event);
        if (!authenticatedUser) {
            return Util.envelop('Token not present or invalid.', 422);
        }
        return Util.envelop({
            user: authenticatedUser
        });
    },
    async update(event) {
        const authenticatedUser = await authenticateAndGetUser(event);
        if (!authenticatedUser) {
            return Util.envelop({message: 'Must be logged in.'}, 422);
        }
        const body = JSON.parse(event.body);
        const user  = body.user;
        if (!user) {
            return Util.envelop('User must be specified.', 422);
        }
        const updatedUser = {
            username: authenticatedUser.username,
        };
        if (user.username) {
            // Verify email is not taken
            const userWithThisEmail = await getUserByUsername(user.username);
            if (userWithThisEmail.Count !== 0) {
                return Util.envelop(`Email already taken: [${user.email}]`, 422);
            }
            updatedUser.email = user.email;
        }
        if (user.firstName) {
            updatedUser.image =  user.firstName;
        }
        if (user.lastName) {
            updatedUser.image =  user.lastName;
        }
        if (user.primaryWebsite) {
            updatedUser.image =  user.primaryWebsite;
        }

        await Util.DocumentClient.put({
            TableName: userTable,
            Item: updatedUser,
        }).promise();

        return Util.envelop(updatedUser);
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
async function authenticateAndGetUser(event) {
    try {
        const token = getTokenFromEvent(event);
        const decoded = jwt.verify(token);
        const username = decoded.username;
        const authenticatedUser = await getUserByUsername(username);
        return authenticatedUser.Item;
    } catch (err) {
        return null;
    }
}
function getTokenFromEvent(event) {
    console.log('event.headers', event.headers)
    return event.headers.Authorization.replace('Token ', '');
}
