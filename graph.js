function initGraph(canvas, sim) {
    var ctx = document.getElementById(canvas).getContext('2d');
    var c = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: []
        },
        options: {
            scales: {
                yAxes: [{
                    ticks: {
                        beginAtZero: false
                    }
                }]
            },
            responsive: false,
            animation: {
                duration: 500
            }
        }
    });

    var species = Array.from(sim.speciesInvolved);
    var colours = ['rgba(255, 99, 132, 1)',
        'rgba(54, 162, 235, 1)',
        'rgba(255, 206, 86, 1)',
        'rgba(75, 192, 192, 1)'];

    for (var i = 0; i < species.length; i++) {
        c.data.datasets[i] = {
            label: species[i].name,
            fill: false,
            borderColor: colours[i],
            backgroundColor: colours[i],
            pointRadius: 0
        };
    }
    c.update();
    animateGraph();
    setInterval(animateGraph, 100);
    function animateGraph() {
        var age = sim.age;
        var comp = sim.compositionHistory;
        for (var i = 0; i < species.length; i++) {
            if (!(age === undefined)) {
                c.data.datasets[i].data.push({x: age - 1, y: comp[species[i].name][age]});
            }
        }
        c.data.labels = [...Array(age).keys()];
        c.update();
    }
}


