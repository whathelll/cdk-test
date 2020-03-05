
exports.handler = async function(event:any) {
    console.log("Incoming Event:", JSON.stringify(event));

    return {
        statusCode: 200,
        headers: {"Content-Type": "text/plain"},
        body: `You've hit this ${event.path}, you're awesome`
    }
}